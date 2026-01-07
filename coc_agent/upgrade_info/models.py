from django.db import models

# ===== 建築類別 =====
class BuildingCategory(models.Model):
    """建築類別：防禦、資源、軍事等"""
    name = models.CharField(max_length=50, verbose_name="類別名稱")
    name_en = models.CharField(max_length=50, verbose_name="英文名稱")
    icon = models.CharField(max_length=50, blank=True, verbose_name="圖示")
    order = models.IntegerField(default=0, verbose_name="排序")
    
    class Meta:
        verbose_name = "建築類別"
        verbose_name_plural = "建築類別"
        ordering = ['order']
    
    def __str__(self):
        return self.name


# ===== 建築 =====
class Building(models.Model):
    """建築資訊"""
    name = models.CharField(max_length=100, verbose_name="建築名稱")
    name_en = models.CharField(max_length=100, verbose_name="英文名稱")
    category = models.ForeignKey(BuildingCategory, on_delete=models.CASCADE, verbose_name="類別")
    max_level = models.IntegerField(verbose_name="最高等級")
    image = models.CharField(max_length=200, blank=True, verbose_name="圖片路徑")
    description = models.TextField(blank=True, verbose_name="說明")
    
    class Meta:
        verbose_name = "建築"
        verbose_name_plural = "建築"
        ordering = ['category', 'name']
    
    def __str__(self):
        return f"{self.name} (Lv.{self.max_level})"


# ===== 建築等級 =====
class BuildingLevel(models.Model):
    """建築各等級的升級資訊"""
    building = models.ForeignKey(Building, on_delete=models.CASCADE, related_name='levels', verbose_name="建築")
    level = models.IntegerField(verbose_name="等級")
    
    # 升級費用
    gold_cost = models.BigIntegerField(default=0, verbose_name="金幣")
    elixir_cost = models.BigIntegerField(default=0, verbose_name="聖水")
    dark_elixir_cost = models.IntegerField(default=0, verbose_name="暗黑聖水")
    
    # 升級時間（秒）
    build_time = models.IntegerField(verbose_name="升級時間(秒)")
    
    # 解鎖條件
    th_required = models.IntegerField(verbose_name="需要大本營等級")
    
    # 屬性
    hp = models.IntegerField(default=0, verbose_name="生命值")
    dps = models.IntegerField(default=0, verbose_name="每秒傷害")
    
    class Meta:
        verbose_name = "建築等級"
        verbose_name_plural = "建築等級"
        ordering = ['building', 'level']
        unique_together = ['building', 'level']
    
    def __str__(self):
        return f"{self.building.name} Lv.{self.level}"
    
    def get_time_display(self):
        """將秒數轉換為可讀格式"""
        seconds = self.build_time
        if seconds < 60:
            return f"{seconds}秒"
        elif seconds < 3600:
            return f"{seconds // 60}分"
        elif seconds < 86400:
            hours = seconds // 3600
            mins = (seconds % 3600) // 60
            return f"{hours}時{mins}分" if mins else f"{hours}時"
        else:
            days = seconds // 86400
            hours = (seconds % 86400) // 3600
            return f"{days}天{hours}時" if hours else f"{days}天"


# ===== 英雄 =====
class Hero(models.Model):
    """英雄資訊"""
    name = models.CharField(max_length=100, verbose_name="英雄名稱")
    name_en = models.CharField(max_length=100, verbose_name="英文名稱")
    max_level = models.IntegerField(verbose_name="最高等級")
    image = models.CharField(max_length=200, blank=True, verbose_name="圖片路徑")
    unlock_th = models.IntegerField(verbose_name="解鎖大本營等級")
    description = models.TextField(blank=True, verbose_name="說明")
    
    class Meta:
        verbose_name = "英雄"
        verbose_name_plural = "英雄"
        ordering = ['unlock_th', 'name']
    
    def __str__(self):
        return f"{self.name} (Lv.{self.max_level})"


# ===== 英雄等級 =====
class HeroLevel(models.Model):
    """英雄各等級的升級資訊"""
    hero = models.ForeignKey(Hero, on_delete=models.CASCADE, related_name='levels', verbose_name="英雄")
    level = models.IntegerField(verbose_name="等級")
    
    # 升級費用
    dark_elixir_cost = models.IntegerField(default=0, verbose_name="暗黑聖水")
    
    # 升級時間（秒）
    upgrade_time = models.IntegerField(verbose_name="升級時間(秒)")
    
    # 解鎖條件
    th_required = models.IntegerField(verbose_name="需要大本營等級")
    
    # 屬性
    hp = models.IntegerField(default=0, verbose_name="生命值")
    dps = models.IntegerField(default=0, verbose_name="每秒傷害")
    ability_damage = models.IntegerField(default=0, verbose_name="技能傷害")
    
    class Meta:
        verbose_name = "英雄等級"
        verbose_name_plural = "英雄等級"
        ordering = ['hero', 'level']
        unique_together = ['hero', 'level']
    
    def __str__(self):
        return f"{self.hero.name} Lv.{self.level}"
    
    def get_time_display(self):
        seconds = self.upgrade_time
        if seconds < 3600:
            return f"{seconds // 60}分"
        elif seconds < 86400:
            hours = seconds // 3600
            return f"{hours}時"
        else:
            days = seconds // 86400
            hours = (seconds % 86400) // 3600
            return f"{days}天{hours}時" if hours else f"{days}天"


# ===== 兵種類別 =====
class TroopType(models.Model):
    """兵種類別：聖水兵、暗黑兵、法術等"""
    name = models.CharField(max_length=50, verbose_name="類別名稱")
    name_en = models.CharField(max_length=50, verbose_name="英文名稱")
    icon = models.CharField(max_length=50, blank=True, verbose_name="圖示")
    order = models.IntegerField(default=0, verbose_name="排序")
    
    class Meta:
        verbose_name = "兵種類別"
        verbose_name_plural = "兵種類別"
        ordering = ['order']
    
    def __str__(self):
        return self.name


# ===== 兵種 =====
class Troop(models.Model):
    """兵種資訊"""
    name = models.CharField(max_length=100, verbose_name="兵種名稱")
    name_en = models.CharField(max_length=100, verbose_name="英文名稱")
    troop_type = models.ForeignKey(TroopType, on_delete=models.CASCADE, verbose_name="類別")
    max_level = models.IntegerField(verbose_name="最高等級")
    image = models.CharField(max_length=200, blank=True, verbose_name="圖片路徑")
    housing_space = models.IntegerField(default=1, verbose_name="人口空間")
    training_time = models.IntegerField(default=0, verbose_name="訓練時間(秒)")
    description = models.TextField(blank=True, verbose_name="說明")
    
    class Meta:
        verbose_name = "兵種"
        verbose_name_plural = "兵種"
        ordering = ['troop_type', 'name']
    
    def __str__(self):
        return f"{self.name} (Lv.{self.max_level})"


# ===== 兵種等級 =====
class TroopLevel(models.Model):
    """兵種各等級的升級資訊"""
    troop = models.ForeignKey(Troop, on_delete=models.CASCADE, related_name='levels', verbose_name="兵種")
    level = models.IntegerField(verbose_name="等級")
    
    # 升級費用
    elixir_cost = models.BigIntegerField(default=0, verbose_name="聖水")
    dark_elixir_cost = models.IntegerField(default=0, verbose_name="暗黑聖水")
    
    # 升級時間（秒）
    upgrade_time = models.IntegerField(verbose_name="升級時間(秒)")
    
    # 解鎖條件
    lab_required = models.IntegerField(verbose_name="需要實驗室等級")
    
    # 屬性
    dps = models.IntegerField(default=0, verbose_name="每秒傷害")
    hp = models.IntegerField(default=0, verbose_name="生命值")
    
    class Meta:
        verbose_name = "兵種等級"
        verbose_name_plural = "兵種等級"
        ordering = ['troop', 'level']
        unique_together = ['troop', 'level']
    
    def __str__(self):
        return f"{self.troop.name} Lv.{self.level}"
    
    def get_time_display(self):
        seconds = self.upgrade_time
        if seconds < 3600:
            return f"{seconds // 60}分"
        elif seconds < 86400:
            hours = seconds // 3600
            return f"{hours}時"
        else:
            days = seconds // 86400
            hours = (seconds % 86400) // 3600
            return f"{days}天{hours}時" if hours else f"{days}天"
