import {test,expect} from '@playwright/test'
test.skip(!!process.env.AUTH_E2E,'Local plans')
test('body-part search adds an exercise only after plan confirmation',async({page})=>{
 await page.goto('/#/training')
 await page.getByRole('button',{name:'内置动作库',exact:true}).click()
 await page.getByLabel('按身体部位').selectOption('臀腿')
 await page.getByLabel('动作库搜索').fill('臀桥')
 await page.getByRole('button',{name:'选择此动作加入计划预览'}).click()
 await page.getByRole('dialog').getByRole('button',{name:'预览自定义计划'}).click()
 await expect(page.getByRole('dialog')).toContainText('臀桥')
 await page.getByRole('button',{name:'确认保存自定义计划'}).click()
 await expect(page.locator('.exercise-row').filter({hasText:'臀桥'})).toHaveCount(1)
})
