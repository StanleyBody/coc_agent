from django.shortcuts import render

from .calculator import calculate
from .coc_api import CocApiError, get_player, summarize_player
from .forms import SixthBuilderForm


def sixth_builder(request):
    """第六工人（B.O.B）資源計算機"""
    result = player = api_error = None
    if request.GET:
        form = SixthBuilderForm(request.GET)
        if form.is_valid():
            try:
                player = summarize_player(get_player(form.cleaned_data['player_tag']))
            except CocApiError as e:
                api_error = str(e)
            result = calculate(
                form.cleaned_data,
                builder_hall_level=player['builder_hall_level'] if player else None,
            )
    else:
        form = SixthBuilderForm()
    storage_pairs = [
        (form['gold_storage_1'], form['gold_storage_2'], '金庫'),
        (form['elixir_storage_1'], form['elixir_storage_2'], '聖水瓶'),
    ]
    return render(request, 'sixth_builder.html', {
        'form': form,
        'storage_pairs': storage_pairs,
        'result': result,
        'player': player,
        'api_error': api_error,
    })
