from __future__ import unicode_literals

from django.db import models
from django.contrib.auth.models import User
from authentification.models import Document, Sentence, Word
from django.utils import timezone

class Historique(models.Model):
    date = models.DateTimeField(default=timezone.now, blank=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE) # cle etrangere vers document, suppression en cascade
    document = models.ForeignKey(Document, on_delete=models.CASCADE) # cle etrangere vers document, suppression en cascade
    action = models.CharField(max_length = 10000)
    def __str__(self):
        return self.action
