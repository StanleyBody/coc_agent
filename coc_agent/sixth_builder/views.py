from django.shortcuts import render

from .calculator import calculate
from .forms import SixthBuilderForm


def sixth_builder(request):
    """第六工人（B.O.B）資源計算機"""
    result = None
    if request.GET:
        form = SixthBuilderForm(request.GET)
        if form.is_valid():
            result = calculate(form.cleaned_data)
    else:
        form = SixthBuilderForm()
    return render(request, 'sixth_builder.html', {'form': form, 'result': result})
