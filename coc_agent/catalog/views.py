from django.shortcuts import render
from .models import User

def index(request):
    """View function for home page of site."""
    
    num_users = User.objects.count()

    context = {
        'num_users': num_users,
    }

    # Render the HTML template index.html with the data in the context variable
    return render(request, 'index.html', context=context)
