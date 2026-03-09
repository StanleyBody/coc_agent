from django.db import models


def format_time_display(seconds):
    """Convert seconds to a human-readable string."""
    if seconds < 60:
        return f"{seconds}s"
    elif seconds < 3600:
        mins = seconds // 60
        return f"{mins}m"
    elif seconds < 86400:
        hours = seconds // 3600
        mins = (seconds % 3600) // 60
        return f"{hours}h {mins}m" if mins else f"{hours}h"
    else:
        days = seconds // 86400
        hours = (seconds % 86400) // 3600
        return f"{days}d {hours}h" if hours else f"{days}d"


# ===== Building Category =====
class BuildingCategory(models.Model):
    name = models.CharField(max_length=100, verbose_name="Name")
    name_zh = models.CharField(max_length=50, blank=True, verbose_name="Chinese Name")
    icon = models.CharField(max_length=50, blank=True, verbose_name="Icon")
    order = models.IntegerField(default=0, verbose_name="Order")

    class Meta:
        verbose_name = "Building Category"
        verbose_name_plural = "Building Categories"
        ordering = ['order']

    def __str__(self):
        return self.name


# ===== Building =====
class Building(models.Model):
    name = models.CharField(max_length=100, verbose_name="Name")
    name_zh = models.CharField(max_length=100, blank=True, verbose_name="Chinese Name")
    category = models.ForeignKey(BuildingCategory, on_delete=models.CASCADE, verbose_name="Category")
    max_level = models.IntegerField(verbose_name="Max Level")
    image = models.CharField(max_length=200, blank=True, verbose_name="Image Path")
    description = models.TextField(blank=True, verbose_name="Description")

    class Meta:
        verbose_name = "Building"
        verbose_name_plural = "Buildings"
        ordering = ['category', 'name']

    def __str__(self):
        return f"{self.name} (Lv.{self.max_level})"


# ===== Building Level =====
class BuildingLevel(models.Model):
    building = models.ForeignKey(Building, on_delete=models.CASCADE, related_name='levels', verbose_name="Building")
    level = models.IntegerField(verbose_name="Level")

    # Upgrade cost
    gold_cost = models.BigIntegerField(default=0, verbose_name="Gold")
    elixir_cost = models.BigIntegerField(default=0, verbose_name="Elixir")
    dark_elixir_cost = models.IntegerField(default=0, verbose_name="Dark Elixir")

    # Upgrade time (seconds)
    build_time = models.IntegerField(verbose_name="Build Time (s)")

    # Unlock requirement
    th_required = models.IntegerField(verbose_name="TH Required")

    # Stats
    hp = models.IntegerField(default=0, verbose_name="HP")
    dps = models.IntegerField(default=0, verbose_name="DPS")

    class Meta:
        verbose_name = "Building Level"
        verbose_name_plural = "Building Levels"
        ordering = ['building', 'level']
        unique_together = ['building', 'level']

    def __str__(self):
        return f"{self.building.name} Lv.{self.level}"

    def get_time_display(self):
        return format_time_display(self.build_time)


# ===== Hero =====
class Hero(models.Model):
    name = models.CharField(max_length=100, verbose_name="Name")
    name_zh = models.CharField(max_length=100, blank=True, verbose_name="Chinese Name")
    max_level = models.IntegerField(verbose_name="Max Level")
    image = models.CharField(max_length=200, blank=True, verbose_name="Image Path")
    unlock_th = models.IntegerField(verbose_name="Unlock TH")
    description = models.TextField(blank=True, verbose_name="Description")

    class Meta:
        verbose_name = "Hero"
        verbose_name_plural = "Heroes"
        ordering = ['unlock_th', 'name']

    def __str__(self):
        return f"{self.name} (Lv.{self.max_level})"


# ===== Hero Level =====
class HeroLevel(models.Model):
    hero = models.ForeignKey(Hero, on_delete=models.CASCADE, related_name='levels', verbose_name="Hero")
    level = models.IntegerField(verbose_name="Level")

    # Upgrade cost
    dark_elixir_cost = models.IntegerField(default=0, verbose_name="Dark Elixir")

    # Upgrade time (seconds)
    upgrade_time = models.IntegerField(verbose_name="Upgrade Time (s)")

    # Unlock requirement
    th_required = models.IntegerField(verbose_name="TH Required")

    # Stats
    hp = models.IntegerField(default=0, verbose_name="HP")
    dps = models.IntegerField(default=0, verbose_name="DPS")
    ability_damage = models.IntegerField(default=0, verbose_name="Ability Damage")

    class Meta:
        verbose_name = "Hero Level"
        verbose_name_plural = "Hero Levels"
        ordering = ['hero', 'level']
        unique_together = ['hero', 'level']

    def __str__(self):
        return f"{self.hero.name} Lv.{self.level}"

    def get_time_display(self):
        return format_time_display(self.upgrade_time)


# ===== Troop Type =====
class TroopType(models.Model):
    name = models.CharField(max_length=50, verbose_name="Name")
    name_zh = models.CharField(max_length=50, blank=True, verbose_name="Chinese Name")
    icon = models.CharField(max_length=50, blank=True, verbose_name="Icon")
    order = models.IntegerField(default=0, verbose_name="Order")

    class Meta:
        verbose_name = "Troop Type"
        verbose_name_plural = "Troop Types"
        ordering = ['order']

    def __str__(self):
        return self.name


# ===== Troop =====
class Troop(models.Model):
    name = models.CharField(max_length=100, verbose_name="Name")
    name_zh = models.CharField(max_length=100, blank=True, verbose_name="Chinese Name")
    troop_type = models.ForeignKey(TroopType, on_delete=models.CASCADE, verbose_name="Type")
    max_level = models.IntegerField(verbose_name="Max Level")
    image = models.CharField(max_length=200, blank=True, verbose_name="Image Path")
    housing_space = models.IntegerField(default=1, verbose_name="Housing Space")
    training_time = models.IntegerField(default=0, verbose_name="Training Time (s)")
    description = models.TextField(blank=True, verbose_name="Description")

    class Meta:
        verbose_name = "Troop"
        verbose_name_plural = "Troops"
        ordering = ['troop_type', 'name']

    def __str__(self):
        return f"{self.name} (Lv.{self.max_level})"


# ===== Troop Level =====
class TroopLevel(models.Model):
    troop = models.ForeignKey(Troop, on_delete=models.CASCADE, related_name='levels', verbose_name="Troop")
    level = models.IntegerField(verbose_name="Level")

    # Upgrade cost
    elixir_cost = models.BigIntegerField(default=0, verbose_name="Elixir")
    dark_elixir_cost = models.IntegerField(default=0, verbose_name="Dark Elixir")

    # Upgrade time (seconds)
    upgrade_time = models.IntegerField(verbose_name="Upgrade Time (s)")

    # Unlock requirement
    lab_required = models.IntegerField(verbose_name="Lab Required")

    # Stats
    dps = models.IntegerField(default=0, verbose_name="DPS")
    hp = models.IntegerField(default=0, verbose_name="HP")

    class Meta:
        verbose_name = "Troop Level"
        verbose_name_plural = "Troop Levels"
        ordering = ['troop', 'level']
        unique_together = ['troop', 'level']

    def __str__(self):
        return f"{self.troop.name} Lv.{self.level}"

    def get_time_display(self):
        return format_time_display(self.upgrade_time)
