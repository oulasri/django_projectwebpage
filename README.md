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
sudo chmod +x ~/django_projectwebpage/static/c/outwave
```
  
2. Installer les dépendances
Pour commencer nous allons installer Django avec la commande suivante. Il faut noter que pour cette phase d'installation nous allons avoir besoin de l'outil [pip](https://pypi.python.org/pypi/pip) qui gère les packages Python.
```
sudo pip install django
```
Nous allons maintenant installer [Redis](https://redis.io/topics/quickstart) qui a pour but de stocker des valeurs associées à des clés. Django et Celery vont utiliser Redis afin de créer un Hash Map pour faciliter les traitements et viter de stocker les informations en dur dans la base de données.
```
sudo pip install redis
sudo apt-get install -y tcl
wget http://download.redis.io/redis-stable.tar.gz
tar xvzf redis-stable.tar.gz
cd redis-stable
make
make test
cp src/redis-server /usr/local/bin/
cp src/redis-cli /usr/local/bin/
```
Nous allons maintenant installer [Celery](http://docs.celeryproject.org/en/latest/django/first-steps-with-django.html).
```
pip install django-celery
pip install -U Celery
pip install Flask-SQLAlchemy
```
L'installation de [Postgresql](https://www.postgresql.org/) nous permet de gérer notre application avec une base de données plus robuste que SQLite. Nous pouvons mieux gérer les accès concurrent à la base de données de cette manière.
```
sudo apt-get install libpq-dev python-dev
sudo apt-get install postgresql postgresql-contrib
sudo pip install psycopg2
```

Installation des application Django
```
sudo pip install srt
sudo apt-get install ffmpeg
sudo pip install -U channels
sudo	pip install django-cors-headers
sudo	pip install asgi_redis
sudo apt-get install libsndfile1-dev
```

3. Création de la base de données
Après avoir installer la base de données [Postgresql](https://www.postgresql.org/), nous devons créer celle-ci sur notre serveur.
```
sudo su - postgres
createdb <database_name>
createuser -P <user_name>
psql
GRANT ALL PRIVILEGES ON DATABASE <database_name> TO <user_name>;
```

Il faut maintenant changer le fichier `~/django_projectwebpage/v0/settings.py` pour qu'il prenne en compte la base de données de l'on vient de créer
```
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': '<database_name>',
        'USER': '<user_name>',
        'PASSWORD': '<password>',
        'HOST': 'localhost',
        ’PORT': '',
    }
}
```

Nous devons maintenant créer les tables et les migrer dans notre application web Django
```
cd ~/django_projectwebpage
python manage.py makemigrations authentification
python manage.py makemigrations backend
python manage.py migrate
```

4. Mettre à jours les informations IP 
Pour mettre en ligne cette apllication, vous devez bénéficier d'un serveur web. Vous allez donc être propriétaire d'une adresse IP. Vous pouvez tout aussi bien déployer l'application en localhost sur l'adresse 127.0.0.1 mais plusieurs fonctionnalités ne seront pas disponible et pour éditer un document en collaboration vous devrez être sur la même machine physique.
Tout d'abord, générer une clé secrète sur ce [Lien](http://www.miniwebtool.com/django-secret-key-generator/). Ensuite modifiez le fichier `~/django_projectwebpage/v0/settings.py` et remplacez `X.X.X.X` par l'adresse `IP de votre serveur`:
```
SECRET_KEY = 'YOUR_SECRET_KEY'
...
ALLOWED_HOSTS = [   'localhost',
                    '127.0.0.1',
                    '127.0.1.1',
                    'X.X.X.X', ]
ADMINS = (
    ('<admin_name>', '<admin_mail_adresse>'),
)

CORS_ORIGIN_WHITELIST = [
    'X.X.X.X:80',
    'X.X.X.X:81',
```
5. Installation de NGinx
Le framework Django ne permet pas de servir les fichiers static en production par soucis de sécurité. Il faut donc faire appel à un serveur de fichier, ici nous utiliserons [Nginx](https://www.nginx.com/).
```
sudo apt-get install nginx
```
Après l'installation, il faut modifier le fichier `/etc/nginx/sites-available/default`. Modifier `X.X.X.X` par l'adresse IP de votre serveur.
```
server {
	listen 81 default_server;
	listen [::]:81 default_server;

            root /usr/share/nginx/www;
	index index.html index.htm index.nginx-debian.html;

	server_name X.X.X.X;

    location / {
            if ($request_method = 'OPTIONS') {
                 add_header 'Access-Control-Allow-Origin' '*';
                 add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS';
                 add_header 'Access-Control-Allow-Headers' 'DNT,X-CustomHeader,Keep-Alive,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Content-Range,Range';
                 add_header 'Access-Control-Max-Age' 1728000;
                 add_header 'Content-Type' 'text/plain charset=UTF-8';
                 add_header 'Content-Length' 0;
                 return 204;
            }
            if ($request_method = 'POST') {
                 add_header 'Access-Control-Allow-Origin' '*';
                 add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS';
                 add_header 'Access-Control-Allow-Headers' 'DNT,X-CustomHeader,Keep-Alive,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Content-Range,Range';
                 add_header 'Access-Control-Expose-Headers' 'DNT,X-CustomHeader,Keep-Alive,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Content-Range,Range';
            }
            if ($request_method = 'GET') {
                 add_header 'Access-Control-Allow-Origin' '*';
                 add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS';
                 add_header 'Access-Control-Allow-Headers' 'DNT,X-CustomHeader,Keep-Alive,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Content-Range,Range';
                 add_header 'Access-Control-Expose-Headers' 'DNT,X-CustomHeader,Keep-Alive,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Content-Range,Range';
            }
    }
}
```

6. 
7. 
