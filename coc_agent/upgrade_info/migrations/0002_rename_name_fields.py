from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('upgrade_info', '0001_initial'),
    ]

    operations = [
        # Rename name -> name_zh first (to free up the 'name' column name),
        # then rename name_en -> name.

        # BuildingCategory
        migrations.RenameField('BuildingCategory', 'name', 'name_zh'),
        migrations.RenameField('BuildingCategory', 'name_en', 'name'),

        # Building
        migrations.RenameField('Building', 'name', 'name_zh'),
        migrations.RenameField('Building', 'name_en', 'name'),

        # Hero
        migrations.RenameField('Hero', 'name', 'name_zh'),
        migrations.RenameField('Hero', 'name_en', 'name'),

        # TroopType
        migrations.RenameField('TroopType', 'name', 'name_zh'),
        migrations.RenameField('TroopType', 'name_en', 'name'),

        # Troop
        migrations.RenameField('Troop', 'name', 'name_zh'),
        migrations.RenameField('Troop', 'name_en', 'name'),
    ]
