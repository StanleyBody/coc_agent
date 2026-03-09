import os
from crewai import Agent, Task, Crew, Process
from langchain_google_genai import ChatGoogleGenerativeAI

# 1. 放入你的 Google Gemini API Key (可至 Google AI Studio 免費申請)
os.environ["GOOGLE_API_KEY"] = ""

# 2. 設定代理們的大腦 (使用 Google Gemini 模型)
llm = ChatGoogleGenerativeAI(model="gemini-2.5-flash")

# ==========================================
# 第一步：定義你的團隊成員 (Agents)
# ==========================================

# 角色 1：系統架構師
architect = Agent(
    role='資深系統架構師',
    goal='分析前端需求，設計出最完美的 Django 資料庫結構 (Models) 與 API 路由規劃',
    backstory='你是一個擁有 15 年經驗的網站架構師，精通 Django 框架。你總是能設計出最乾淨、易於擴展的資料庫。',
    verbose=True,
    allow_delegation=False,
    llm=llm
)

# 角色 2：Django 後端工程師
developer = Agent(
    role='Django 後端工程師',
    goal='根據架構師的規劃，撰寫出沒有 Bug 的 Django 程式碼 (models.py, views.py, urls.py)',
    backstory='你是一個寫 Code 速度極快且精準的 Python 工程師，你非常熟悉 Django REST Framework。',
    verbose=True,
    allow_delegation=False,
    llm=llm
)

# 角色 3：QA 程式碼審查員
reviewer = Agent(
    role='資深 QA 與程式碼審查員',
    goal='嚴格檢查工程師寫的程式碼，找出所有可能的錯誤（例如忘記 import、語法錯誤、不符合 Django 慣例的地方）',
    backstory='你是一個極度龜毛的資深工程師，任何一點點小 Bug 都逃不過你的眼睛。',
    verbose=True,
    allow_delegation=False,
    llm=llm
)

# ==========================================
# 第二步：指派任務 (Tasks)
# ==========================================

# 告訴它們你的前端大概長怎樣，想要什麼功能 (這裡請改成你真實的網站需求)
website_description = """
我有一個部落衝突攻略網站的前端已經做好了。
主要有六個頁面，但先幫我完成升級資訊頁面：
1. 升級資訊:列出所有升級資訊，資料來源目前沒想法。
"""

task1 = Task(
    description=f'分析以下網站需求：{website_description}。請規劃出 Django 需要哪些 Models，並列出欄位。',
    expected_output='一份清晰的資料庫規劃清單。',
    agent=architect
)

task2 = Task(
    description='根據架構師的規劃，實際撰寫出 models.py 和 views.py 的 Python 程式碼。',
    expected_output='完整的 Django models.py 與 views.py 程式碼。',
    agent=developer
)

task3 = Task(
    description='審查工程師寫出的程式碼，確保沒有語法錯誤，並且給出最終可以直接複製貼上的完美版本。',
    expected_output='經過審查且無錯誤的最終版 Django 程式碼。',
    agent=reviewer,
    output_file='my_django_code.py'
)

# ==========================================
# 第三步：組建團隊並開始工作
# ==========================================
django_team = Crew(
    agents=[architect, developer, reviewer],
    tasks=[task1, task2, task3],
    verbose=True,
    process=Process.sequential # 讓它們依序工作：架構師 -> 工程師 -> 審查員
)

print("你的 Django 虛擬團隊開始工作了！請稍候...\n")
result = django_team.kickoff()

print("==========================================")
print("工作完成！這是最終的程式碼結果：")
print("==========================================")
print(result)