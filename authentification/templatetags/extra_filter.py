from django import template
from django.conf import settings
import os


register = template.Library()


@register.filter
def image_exist(url):
    # si le fichier miniature existe, on retourne vrai, sinon faux
    return os.path.exists(settings.BASE_DIR + url)