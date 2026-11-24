from django.shortcuts import render


def sixth_builder(request):
    """第六工人（B.O.B）資源計算機；計算在前端 JS 完成"""
    return render(request, 'sixth_builder.html')
