# Zmind 提交入口统一 - 需求确认问题

请回答以下问题以确认需求细节。

## Question 1
附件上传到 zmind 的方式：目前 VersionIssueList 的附件是先上传到本地服务器，但并未通过 Redmine API 上传到 zmind。你希望问题追踪的附件上传如何处理？

A) 与 VersionIssueList 一致：附件只存本地服务器，zmind issue 描述中附带附件链接
B) 真正上传到 zmind：通过 Redmine uploads API 将附件上传到 zmind 服务器，issue 创建时关联附件
C) 两者都支持：本地存一份，同时上传到 zmind
D) Other (please describe after [Answer]: tag below)

[Answer]: B

## Question 2
自定义字段"显示全部"的含义：目前 VersionIssueList 按 tracker 过滤自定义字段（只显示与选中 tracker 关联的字段）。你说"显示全部字段（不只是 required）"，具体是指？

A) 保持按 tracker 过滤，但显示该 tracker 下的所有字段（包括非必填）
B) 不按 tracker 过滤，显示项目下所有自定义字段（包括非必填）
C) Other (please describe after [Answer]: tag below)

[Answer]: B

## Question 3
描述模板统一：目前两个入口的模板略有不同。VersionIssueList 的模板包含"问题描述/复现步骤/实际结果/期望结果/复现概率/备注"，CustomerProblemForm 的模板多了"测试环境"部分。统一后使用哪个？

A) 使用 VersionIssueList 的模板（不含测试环境，因为有独立的测试环境字段）
B) 使用 CustomerProblemForm 的模板（含测试环境信息）
C) 合并两者：包含所有字段（问题描述/复现步骤/实际结果/期望结果/复现概率/测试环境/备注）
D) Other (please describe after [Answer]: tag below)

[Answer]: 按照以下模板
"
【Tested Environment】

【Initial Situation】

【Operation Steps】

  [Step1]

  [Step2]

  [Step3]

  [Step4]

【 Actual Result 】

【Expect Result】

【Frequency Details】
 
【Recovery Method】

"
