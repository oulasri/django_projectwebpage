Created by [Rachid Oulasri](https://www.linkedin.com/in/rachid-oulasri/)



# Interface d'édition de sous-titre collaboratif

Ce projet sous licence [MIT](https://opensource.org/licenses/MIT) a pour but de fournir une interface d'édition de sous-titres collaboratif. 

Cette interface s'appuie sur le framework [Django](https://docs.djangoproject.com/en/1.11/) qui permet de développer des applictions web avec le langage python et html. Elle utilise aussi [Celery](http://docs.celeryproject.org/en/latest/django/first-steps-with-django.html) et [Redis](https://redis.io/documentation) afin d'éffectuer des taches en arrière plan que nous allons détailler plus tard.


 
# Installation

1. Télécharger les sources
```
/django_projectwebpage
  /v0
  /static
  /authentification
  /backend
  /templates
  manage.py
```

L'interface d'édition utilise le travail Open-Source de [vdot](https://github.com/vdot/outwave.js) pour manipuler le flux d'un signal audio sur un naviguateur.
Il faut donc donner les droits à notre application d'éxécuter la librairie qui génère ce flux audio.
```
chmod +x ~/django_projectwebpage/static/c/outwave
```
  
2. Installer les dépendances
Pour commencer nous allons installer Django avec la commande suivante. Il faut noter que pour cette phase d'installation nous allons avoir besoin de l'outil [pip](https://pypi.python.org/pypi/pip) qui gère les packages Python.
```
pip install django
```
Nous allons maintenant installer [Redis](https://redis.io/topics/quickstart) qui a pour but de stocker des valeurs associées à des clés. Django et Celery vont utiliser Redis afin de créer un Hash Map pour faciliter les traitements et viter de stocker les informations en dur dans la base de données.
```
pip install redis
apt-get install -y tcl
wget http://download.redis.io/redis-stable.tar.gz
tar xvzf redis-stable.tar.gz
cd redis-stable
make
make test
sudo cp src/redis-server /usr/local/bin/
sudo cp src/redis-cli /usr/local/bin/
```

3. Three
4. 
5. Three
6. 
7. 
