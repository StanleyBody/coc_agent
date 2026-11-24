import re

from django import forms

# 玩家標籤只會出現這些字元
TAG_PATTERN = re.compile(r'^#[0289PYLQGRJCUV]{3,12}$')


def _level_field(label, min_value, max_value):
    return forms.IntegerField(
        label=label, min_value=min_value, max_value=max_value,
        widget=forms.NumberInput(attrs={'class': 'sb-input', 'inputmode': 'numeric'}),
    )


def _amount_field(label):
    return forms.IntegerField(
        label=label, min_value=0,
        widget=forms.NumberInput(attrs={'class': 'sb-input', 'inputmode': 'numeric'}),
    )


class SixthBuilderForm(forms.Form):
    player_tag = forms.CharField(
        label='玩家標籤', max_length=15,
        widget=forms.TextInput(attrs={'class': 'sb-input', 'placeholder': '#2YPJ8VCRL'}),
    )

    double_cannon = _level_field('雙管加農砲', 0, 10)
    archer_tower = _level_field('箭塔', 0, 10)
    multi_mortar = _level_field('多管迫擊砲', 0, 10)
    star_laboratory = _level_field('星空實驗室', 1, 10)
    builder_barracks = _level_field('訓練營', 1, 12)

    gold_storage_1 = _level_field('金庫 1', 0, 10)
    gold_storage_2 = _level_field('金庫 2', 0, 10)
    elixir_storage_1 = _level_field('聖水瓶 1', 0, 10)
    elixir_storage_2 = _level_field('聖水瓶 2', 0, 10)

    gold_rate = _amount_field('每小時金幣產量')
    elixir_rate = _amount_field('每小時聖水產量')

    bob_control_built = forms.BooleanField(label='已建造 B.O.B Control', required=False)

    def clean_player_tag(self):
        tag = self.cleaned_data['player_tag'].strip().upper().replace('O', '0')
        if not tag.startswith('#'):
            tag = '#' + tag
        if not TAG_PATTERN.match(tag):
            raise forms.ValidationError('玩家標籤格式錯誤，只能包含 0289PYLQGRJCUV')
        return tag
