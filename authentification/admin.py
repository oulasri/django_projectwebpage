from django.contrib import admin
from .models import Document, Collection, Sentence, Word, Locuteur

# Permet de rajouter les tables Collection et Document dans la base de donnees 
# selon les liaisons des deux classes python


admin.site.register(Collection)
admin.site.register(Document)
admin.site.register(Sentence)
admin.site.register(Word)
admin.site.register(Locuteur)

