from django.shortcuts import render

def events(request):
    """活動公告頁面"""
    return render(request, 'events.html')
