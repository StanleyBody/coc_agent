from django.db import models

# Create your models here.

class User(models.Model):
    """Model representing a book genre."""
    account = models.CharField(max_length=200)
    password = models.CharField(max_length=200)

    def __str__(self):
        """String for representing the Model object."""
        return self.account