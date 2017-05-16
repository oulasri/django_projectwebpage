from __future__ import unicode_literals
from django.db import models
from django.contrib.auth.models import User


# Cette classe permet d'ajouter des attributs a la classe User de base dans Django
# Nous n'en avons pas besoin pour l'instant
#class utilisateur(models.Model):
    #user = models.OneToOneField(User)
    # ajouter variables user ici ...
    # par exemple si on souhaite ajouter un avatar ...
    # avatar = models.ImageField(null=True, blank=True, upload_to="avatars/")


class Document(models.Model):
    titre = models.CharField(max_length = 100)
    type_fichier = models.CharField(max_length = 5) # "audio" ou "video"
    chemin_fichier = models.CharField(max_length = 200)
    chemin_xml_contenu = models.CharField(max_length = 200)
    client = models.CharField(max_length = 50)
    users = models.ManyToManyField(User) # relation de type many-to-many vers la classe User
    uploaded = models.BooleanField(default=False)
    validated = models.BooleanField(default=False)

    def __str__(self):
        return self.titre


class Collection(models.Model):
    titre = models.CharField(max_length = 100)
    documents = models.ManyToManyField(Document) # relation de type many-to-many vers la classe Document
    users = models.ManyToManyField(User) # relation de type many-to-many vers la classe User

    def __str__(self):
        return self.titre

class Locuteur(models.Model):
    name = models.CharField(max_length = 100)
    document = models.ForeignKey(Document)
    def __str__(self):
        return self.name


class Sentence(models.Model):
   # locuteur = models.ForeignKey(Locuteur)
    start_time = models.FloatField()
    end_time = models.FloatField()
    valeur = models.CharField(max_length = 5000)
    validated = models.BooleanField(default=False)
    inaudible = models.BooleanField(default=False)
    current_correcteur = models.ForeignKey(User, null=True, blank=True,default=None)
    document = models.ForeignKey(Document, on_delete=models.CASCADE) # cle etrangere vers document, suppression en cascade

    def __str__(self):
        return '%s - %s' % (self.current_correcteur, self.valeur)


class Word(models.Model):
    start_time = models.FloatField()
    end_time = models.FloatField()
    valeur = models.CharField(max_length = 30)
    sentence = models.ForeignKey(Sentence, on_delete=models.CASCADE) # cle etrangere vers sentence, suppression en cascade

    def __str__(self):
        
        return self.valeur















