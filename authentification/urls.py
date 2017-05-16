from django.conf.urls import url
from . import views

urlpatterns = [
    url(r'^$', views.connexion),
    url(r'^login$', views.connexion, name='connexion'),
    url(r'^logout$', views.deconnexion, name='deconnexion'),
    url(r'^newUser$', views.nouveauCompte, name='nouveauCompte'),
    url(r'^collection$', views.collection, name='collection'),
    url(r'^collection/(\d+)$', views.collectionId, name='collectionId'),
    url(r'^collection/delete/(\d+)$', views.deleteCollection, name='deleteCollection'),
    url(r'^collection/edit/(\d+)$', views.editCollection, name='editCollection'),
    url(r'^document/(\d+)$', views.document, name='document'),
    url(r'^document/test$', views.documentTest, name='documentTest'),
    url(r'^document/edit/(\d+)$', views.editDocument, name='editDocument'),
    url(r'^document/delete/(\d+)$', views.deleteDocument, name='deleteDocument'),
    url(r'^document/addCorrecteur/(\d+)$', views.addCorrecteur, name='addCorrecteur'),
    url(r'^document/validateurView/(\d+)$', views.validateurView, name='validateurView'),
    url(r'^document/validate/(\d+)$', views.validateDocument, name='validateDocument'),
    url(r'^document/srt/(\d+)$', views.generateSrt, name='generateSrt'),
    url(r'^newDocument$', views.nouveauDocument, name='nouveauDocument'),
    url(r'^confirm$', views.confirmation, name='confirmation'),
    url(r'^confirm/(\d+)$', views.confirmationId, name='confirmationId'),
    url(r'^dashboard$', views.dashboard, name='dashboard'),
]
