import uuid

from django.contrib.auth.hashers import make_password, check_password
from django.utils import timezone
from django.db import models

# Create your models here.

class User(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    account = models.CharField(max_length=20)
    password = models.CharField(max_length=128)  # 儲存雜湊後的密碼
    email = models.CharField(max_length=50)
    join_date = models.DateTimeField(auto_now_add=True)

    def set_password(self, raw_password):
        """將明文密碼雜湊後儲存"""
        self.password = make_password(raw_password)

    def verify_password(self, raw_password):
        """驗證明文密碼是否與儲存的雜湊值吻合"""
        return check_password(raw_password, self.password)

    def __str__(self):
        return self.account
    
    
class Clan(models.Model):
    tag = models.CharField(primary_key=True, max_length=10)
    name = models.CharField(max_length=20)
    
    def __str__(self):
        return self.tag
    

class Player(models.Model):
    tag = models.CharField(primary_key=True, max_length=10)
    name = models.CharField(max_length=20)
    clan = models.ForeignKey(Clan, on_delete=models.SET_NULL, null=True, blank=True)
    
    def __str__(self):
        return self.tag
    
    
class TrackingList(models.Model):
    TRACKING_TYPE_CHOICES = [('player', 'Player'), ('clan', 'Clan')]
    
    user = models.ForeignKey(User, on_delete=models.CASCADE)  
    tracking_type = models.CharField(max_length=10, choices=TRACKING_TYPE_CHOICES) 

    def __str__(self):
        return f"{self.user.account}'s {self.get_tracking_type_display()} list"
    
    
class PlayerTracking(models.Model):
    tracking_list = models.ForeignKey(TrackingList, on_delete=models.CASCADE)
    player = models.ForeignKey(Player, on_delete=models.CASCADE)

    def __str__(self):
        return f"Tracking {self.player.name} in {self.tracking_list.user.account}'s list"
    

class ClanTracking(models.Model):
    tracking_list = models.ForeignKey(TrackingList, on_delete=models.CASCADE)
    clan = models.ForeignKey(Clan, on_delete=models.CASCADE)

    def __str__(self):
        return f"Tracking {self.clan.name} in {self.tracking_list.user.account}'s list"
    
