from django.contrib import admin
from .models import User, Clan, Player, TrackingList, PlayerTracking, ClanTracking


@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = ['account', 'email', 'join_date']
    search_fields = ['account', 'email']


@admin.register(Clan)
class ClanAdmin(admin.ModelAdmin):
    list_display = ['tag', 'name']
    search_fields = ['tag', 'name']


@admin.register(Player)
class PlayerAdmin(admin.ModelAdmin):
    list_display = ['tag', 'name', 'clan']
    search_fields = ['tag', 'name']
    list_filter = ['clan']


@admin.register(TrackingList)
class TrackingListAdmin(admin.ModelAdmin):
    list_display = ['user', 'tracking_type']
    list_filter = ['tracking_type']


@admin.register(PlayerTracking)
class PlayerTrackingAdmin(admin.ModelAdmin):
    list_display = ['tracking_list', 'player']


@admin.register(ClanTracking)
class ClanTrackingAdmin(admin.ModelAdmin):
    list_display = ['tracking_list', 'clan']
