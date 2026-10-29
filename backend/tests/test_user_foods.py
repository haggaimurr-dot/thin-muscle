import io
import json
import time
import unittest
from contextlib import contextmanager
from unittest.mock import patch

from fastapi.testclient import TestClient
from PIL import Image
from test_accounts import app
from test_integrations import upstream
from app.core.config import settings
from app.core.db import SessionLocal
from app.models.account import LoginAttempt
from app.models.user_food import UserFood


class UserFoodTests(unittest.TestCase):
    def setUp(self):
        self.c = TestClient(app)
        self.c.__enter__()
        with SessionLocal() as db:
            db.query(LoginAttempt).delete()
            db.commit()
        self.owner = self.register(self.c)
        self.other = TestClient(app)
        self.register(self.other)

    def tearDown(self):
        self.other.close()
        self.c.__exit__(None, None, None)

    def register(self, client):
        r = client.post('/api/v1/auth/register', json={'username': 'food_' + str(time.time_ns()), 'password': 'Password-food-tests-123'})
        self.assertEqual(r.status_code, 200, r.text)
        client.headers['X-CSRF-Token'] = r.json()['csrf']
        return r.json()['user']['id']

    @contextmanager
    def ai(self, category='糕饼点心类'):
        with patch.multiple(settings, ai_food_enabled=True, ai_gateway_api_key='not-real', ai_vision_model='test-classifier'), patch('app.api.user_foods.httpx.AsyncClient', return_value=upstream({'choices': [{'message': {'content': json.dumps({'category': category, 'reason': '按食品原料与形态分组'})}}]})) as client:
            yield client

    def save(self, changes=None, food=None, consent=True, image=None):
        body = dict(name='自制燕麦饼干', food_kind='零食', energy=200, energy_unit='kcal', basis_grams=50, visibility='private', status='listed')
        if food:
            body['revision'] = food['revision']
        body.update(changes or {})
        kwargs = {'data': {'payload': json.dumps(body), 'consent': str(consent).lower()}}
        if image is not None:
            kwargs['files'] = {'file': ('food.png', image, 'image/png')}
        return getattr(self.c, 'put' if food else 'post')('/api/v1/foods' + ('/' + food['id'] if food else ''), **kwargs)

    def lifecycle(self, food, **changes):
        return self.c.patch('/api/v1/foods/' + food['id'], json={key: changes.get(key, food[key]) for key in ['revision', 'visibility', 'status']})

    def test_private_public_listing_and_owner_only_mutations(self):
        with self.ai():
            r = self.save()
        self.assertEqual(r.status_code, 200, r.text)
        food = r.json()
        self.assertEqual((food['kcal'], food['category'], food['status']), (400, '糕饼点心类', 'listed'))
        self.assertIsNone(food['protein'])
        path = '/api/v1/foods/' + food['id']
        self.assertEqual(self.other.get(path).status_code, 404)
        self.assertNotIn(food['id'], [f['id'] for f in self.other.get('/api/v1/foods').json()['items']])
        self.assertEqual(self.other.patch(path, json={'revision': food['revision'], 'visibility': 'public', 'status': 'listed'}).status_code, 404)
        food = self.lifecycle(food, visibility='public').json()
        self.assertFalse(self.other.get(path).json()['is_owner'])
        self.assertIn(food['id'], [f['id'] for f in self.other.get('/api/v1/foods?q=燕麦&category=糕饼点心类').json()['items']])
        self.assertNotIn(food['id'], [f['id'] for f in self.other.get('/api/v1/foods?scope=mine').json()['items']])
        self.assertEqual(self.other.put(path, data={'payload': json.dumps({'name': '偷改'})}).status_code, 404)
        self.assertEqual(self.other.post(path + '/classify', json={'revision': food['revision'], 'consent': True}).status_code, 404)
        food = self.lifecycle(food, status='draft').json()
        self.assertEqual(self.other.get(path).status_code, 404)
        food = self.lifecycle(food, status='listed').json()
        self.assertEqual(self.other.get(path).status_code, 200)
        food = self.lifecycle(food, visibility='private').json()
        self.assertEqual(self.other.get(path).status_code, 404)

    def test_ai_unavailable_consent_and_invalid_category_keep_drafts(self):
        with patch.object(settings, 'ai_food_enabled', False):
            food = self.save({'visibility': 'public'}).json()
        self.assertEqual((food['classification_status'], food['status'], food['category']), ('pending', 'draft', ''))
        self.assertEqual(self.lifecycle(food, status='listed').status_code, 409)
        self.assertEqual(self.other.get('/api/v1/foods/' + food['id']).status_code, 404)
        with self.ai() as upstream_call:
            no_consent = self.save(consent=False).json()
            upstream_call.assert_not_called()
        self.assertEqual(no_consent['status'], 'draft')
        with self.ai('arbitrary-unsupported-category'):
            invalid = self.save().json()
        self.assertEqual(invalid['classification_status'], 'pending')
        self.assertEqual(self.c.post('/api/v1/foods/' + food['id'] + '/classify', json={'revision': food['revision'], 'consent': False}).status_code, 422)
        with self.ai('谷物类'):
            r = self.c.post('/api/v1/foods/' + food['id'] + '/classify', json={'revision': food['revision'], 'consent': True})
        self.assertEqual(r.json()['category'], '谷物类')
        self.assertEqual(r.json()['status'], 'draft')

    def test_edits_reclassify_and_stale_revision_does_not_overwrite(self):
        with self.ai():
            food = self.save({'visibility': 'public'}).json()
        with self.ai('水果类'):
            edited = self.save({'name': '水果拼盘', 'food_kind': '水果'}, food=food)
        self.assertEqual(edited.status_code, 200, edited.text)
        current = edited.json()
        self.assertEqual(current['category'], '水果类')
        self.assertEqual(self.save(food=food).status_code, 409)
        self.assertEqual(self.lifecycle(food, status='draft').status_code, 409)
        with self.ai() as upstream_call:
            current = self.save({'name': '另一配方', 'visibility': 'public'}, food=current, consent=False).json()
            upstream_call.assert_not_called()
        self.assertEqual((current['category'], current['status']), ('', 'draft'))
        self.assertEqual(self.other.get('/api/v1/foods/' + current['id']).status_code, 404)

    def test_images_inherit_visibility_and_are_decoded_and_reencoded(self):
        image = io.BytesIO()
        Image.new('RGB', (30, 20)).save(image, 'PNG')
        with self.ai():
            food = self.save(image=image.getvalue()).json()
        image_path = '/api/v1/foods/' + food['id'] + '/image'
        owner = self.c.get(image_path)
        self.assertEqual(owner.status_code, 200)
        self.assertEqual(owner.headers['content-type'], 'image/jpeg')
        self.assertIn('no-store', owner.headers['cache-control'])
        self.assertEqual(self.other.get(image_path).status_code, 404)
        food = self.lifecycle(food, visibility='public').json()
        self.assertEqual(self.other.get(image_path).status_code, 200)
        food = self.lifecycle(food, status='draft').json()
        self.assertEqual(self.other.get(image_path).status_code, 404)
        self.assertEqual(self.save(image=b'not an image').status_code, 422)
        self.assertEqual(self.save(image=b'x' * (8 * 1024 * 1024 + 1)).status_code, 413)

    def test_required_fields_calorie_units_and_finite_values(self):
        for body in [{'name': ' '}, {'food_kind': ''}, {'energy': -1}, {'energy': float('nan')}, {'energy': float('inf')}, {'energy_unit': 'unknown'}, {'basis_grams': 0}, {'basis_grams': -5}, {'energy': 1001, 'basis_grams': 100}, {'protein': 80, 'fat': 40}]:
            self.assertEqual(self.save(body).status_code, 422, body)
        with self.ai():
            food = self.save({'energy': 836.8, 'energy_unit': 'kJ'}).json()
        self.assertAlmostEqual(food['kcal'], 400)
        with self.ai():
            food = self.save({'energy': 0}).json()
        self.assertEqual(food['kcal'], 0)
        self.assertEqual(TestClient(app).get('/api/v1/foods').status_code, 401)
        self.assertEqual(TestClient(app).get('/api/v1/foods/' + food['id']).status_code, 401)
        token = self.c.headers.pop('X-CSRF-Token')
        self.assertEqual(self.save().status_code, 403)
        self.c.headers['X-CSRF-Token'] = token

    def test_classification_does_not_hold_write_lock_or_overwrite_a_newer_edit(self):
        async def concurrent_edit(*args, **kwargs):
            with SessionLocal() as db:
                food = db.query(UserFood).filter_by(user_id=self.owner).one()
                food.name = '并发更新后的食品'
                food.revision += 1
                db.commit()
            return upstream({'choices': [{'message': {'content': json.dumps({'category': '糕饼点心类', 'reason': '迟到的分类'})}}]}).__aenter__.return_value.post.return_value
        with patch.multiple(settings, ai_food_enabled=True, ai_gateway_api_key='not-real', ai_vision_model='test'), patch('app.api.user_foods.httpx.AsyncClient') as client:
            client.return_value = upstream({})
            client.return_value.__aenter__.return_value.post.side_effect = concurrent_edit
            response = self.save({'visibility': 'public'})
        self.assertEqual(response.status_code, 409, response.text)
        mine = self.c.get('/api/v1/foods?scope=mine').json()['items'][0]
        self.assertEqual((mine['name'], mine['status'], mine['category']), ('并发更新后的食品', 'draft', ''))

    def test_delete_account_removes_food_and_image(self):
        image = io.BytesIO()
        Image.new('RGB', (20, 20)).save(image, 'PNG')
        with self.ai():
            food = self.save({'visibility': 'public'}, image=image.getvalue()).json()
        response = self.c.post('/api/v1/auth/account/delete', json={'current_password': 'Password-food-tests-123', 'confirmation': '注销我的账号'})
        self.assertEqual(response.status_code, 200, response.text)
        with SessionLocal() as db:
            self.assertIsNone(db.get(UserFood, food['id']))
        self.assertEqual(self.other.get('/api/v1/foods/' + food['id'] + '/image').status_code, 404)
