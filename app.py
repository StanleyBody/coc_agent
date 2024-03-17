import requests
from flask import Flask


app = Flask(__name__)
@app.route("/")
def hello():
    return "Hello, World!"

@app.route("/player")
def getPlayer():
    headers ={
        "Authorization" : "Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzUxMiIsImtpZCI6IjI4YTMxOGY3LTAwMDAtYTFlYi03ZmExLTJjNzQzM2M2Y2NhNSJ9.eyJpc3MiOiJzdXBlcmNlbGwiLCJhdWQiOiJzdXBlcmNlbGw6Z2FtZWFwaSIsImp0aSI6IjE3NGU0OTI0LTY5ODMtNGM2Yy05N2MwLTQzOWY1ODU5YWNiMiIsImlhdCI6MTcxMDY4Njk4Niwic3ViIjoiZGV2ZWxvcGVyLzE2MzY2MGZmLWQ0ZmQtOGRmMC03ZTViLWRjMDUwMWY3NWI1MyIsInNjb3BlcyI6WyJjbGFzaCJdLCJsaW1pdHMiOlt7InRpZXIiOiJkZXZlbG9wZXIvc2lsdmVyIiwidHlwZSI6InRocm90dGxpbmcifSx7ImNpZHJzIjpbIjI3LjUyLjcwLjgiXSwidHlwZSI6ImNsaWVudCJ9XX0.THhvsI_4e_XUQQa-NZOs_it2h6AkyhFL_huY31T10Gx1q1CDHDEhT-_Pbl6nB81-fU2qFVbJ01MC4nAH9yDLdg"
    }
    
    response = requests.get("https://api.clashofclans.com/v1/players/%238VG9GG8YG", headers = headers)
    response_obj = response.json()
    
    return response_obj
       