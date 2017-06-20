Created by [Rachid Oulasri](https://www.linkedin.com/in/rachid-oulasri/)

# Interface d'édition de sous-titres collaborative
Ce projet sous licence [MIT](https://opensource.org/licenses/MIT) a pour objet de fournir une interface d'édition de sous-titres collaborative. 

Cette interface s'appuie sur le framework [Django](https://docs.djangoproject.com/en/1.11/) qui permet de développer des applications web avec le langage python et HTML. Elle utilise aussi [Celery](http://docs.celeryproject.org/en/latest/django/first-steps-with-django.html) et [Redis](https://redis.io/documentation) afin d'Effectuer des tâches en arrière-plan que nous allons détailler plus tard.
## Installation
#### 1. Télécharger les sources
```
/django_projectwebpage
  /v0
  /static
  /authentification
  /backend
  /templates
  manage.py
```
L'interface d'édition utilise le travail Open-Source de [vdot](https://github.com/vdot/outwave.js) pour manipuler le flux d'un signal audio sur un navigateur. Il faut donc donner les droits à notre application d'exécuter la librairie qui génère ce flux audio.
```
sudo chmod +x ~/django_projectwebpage/static/c/outwave
```
#### 2. Installer les dépendances
Pour commencer nous, allons installer Django avec la commande suivante. Il faut noter que pour cette phase d'installation nous allons avoir besoin de l'outil [pip](https://pypi.python.org/pypi/pip) qui gère les packages Python.
```
pip install django
```
Nous allons maintenant installer [Redis](https://redis.io/topics/quickstart) qui a pour but de stocker des valeurs associées à des clés. **Django** et **Celery** vont utiliser **Redis** afin de créer un Hash Map pour faciliter les traitements et éviter de stocker les informations en dur dans la base de données.
```
pip install redis
sudo apt-get install -y tcl
wget http://download.redis.io/redis-stable.tar.gz
tar xvzf redis-stable.tar.gz
cd redis-stable
make
make test
cp src/redis-server /usr/local/bin/
cp src/redis-cli /usr/local/bin/
```
Nous allons maintenant installer [Celery](http://docs.celeryproject.org/en/latest/django/first-steps-with-django.html). **Celery** a pour objectif d'effectuer des tâches lourdes en arrière-plan sur notre serveur. Ainsi, le serveur Django pourra déléguer une partie de son travail à **Celery** sans bloquer la file d'attente des requêtes GET et POST.
```
pip install django-celery
pip install -U Celery
pip install Flask-SQLAlchemy
```
L'installation de [Postgresql](https://www.postgresql.org/) nous permet de gérer notre application avec une base de données plus robuste que SQLite. Nous pouvons mieux gérer les accès concurrents à la base de données de cette manière. <br/>Vous pouvez opter pour une base de données mongoDB ou autre mais ce ne sera pas documenté dans cet outil.
```
sudo apt-get install libpq-dev python-dev
sudo apt-get install postgresql postgresql-contrib
pip install psycopg2
```
Installation des applications Django.
```
pip install srt
sudo apt-get install ffmpeg
pip install -U channels
pip install django-cors-headers
pip install asgi_redis
sudo apt-get install libsndfile1-dev
```
#### 3. Création de la base de données
Après avoir installé la base de données [Postgresql](https://www.postgresql.org/), nous devons créer celle-ci sur notre serveur.
```
sudo su - postgres
createdb <database_name>
createuser -P <user_name>
psql
GRANT ALL PRIVILEGES ON DATABASE <database_name> TO <user_name>;
```
Il faut maintenant modifier le fichier `~/django_projectwebpage/v0/settings.py` pour qu'il prenne en compte la base de données de l'on vient de créer
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
#### 4. Mettre à jours les informations IP 
Pour mettre en ligne cette application, vous devez bénéficier d'un serveur web. Vous allez donc être propriétaire d'une adresse IP. Vous pouvez tout aussi bien déployer l'application en localhost sur l'adresse 127.0.0.1 mais plusieurs fonctionnalités ne seront pas disponibles et pour éditer un document en collaboration vous devrez être sur la même machine physique.
Tout d'abord, générer une clé secrète sur ce [Lien](http://www.miniwebtool.com/django-secret-key-generator/). Ensuite, modifiez le fichier `~/django_projectwebpage/v0/settings.py` et remplacez `X.X.X.X` par l'adresse `IP de votre serveur`:
```python
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
#### 5. Installation de NGinx
Le framework Django ne permet pas de servir les fichiers statiques en production par souci de sécurité. Il faut donc faire appel à un serveur de fichier, ici nous utiliserons [Nginx](http://nginx.org/en/docs/).
```
sudo apt-get install nginx
```
Après l'installation, il faut modifier le fichier `/etc/nginx/sites-available/default`. Changez `X.X.X.X` par l'adresse IP de votre serveur.
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
Se rendre ensuite dans le répertoire `/usr/share/nginx/` pour créer le lien symbolique suivant
```
mkdir www
cd www
ln -s ~/django_projectwabpage/static/data/ data  
ln -s ~/django_projectwabpage/static/ static 
```
Pour terminer, testez et lancez le serveur Nginx.
```
sudo nginx -t
sudo service nginx restart
```
#### 6. Mise à jour de l'importation des fichiers statics
Nous allons utiliser le serveur Nginx que nous avons installé pour servir les fichiers statiques (css, img, js, ...). Il faut donc remplacer `X.X.X.X` par l'adresse IP de votre serveur dans les fichiers suivants. 
```
/templates/base_connected.html
/templates/base_disconnected.html
/authentification/templates/authentification/collection.html
/authentification/templates/authentification/document.html
/authentification/templates/authentification/documentResume.html
```
#### 7. Activer l'envoi d'e-mails
Pour recevoir un mail à chaque erreur que rencontre un utilisateur, il suffit de mettre à jour les informations qui se trouvent dans `~/django_projectwebpage/v0/settings.py`. Il faut renseigner les l'adresse mail des administrateurs du site.
```python
ADMINS = (
    ('admin_name', 'admin_mail_adresse'),
    ('second_admin_name', 'second_admin_mail_adresse'),
)
```
Pour que le serveur Django envoie l'erreur par mail, il a besoin d'un serveur SMTP. Modiifiez les variables du serveur SMTP dans le document `~/django_projectwebpage/v0/settings.py`.
```python
EMAIL_USE_TLS = True
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = 'host'
EMAIL_HOST_USER = 'email@adress'
EMAIL_HOST_PASSWORD = 'password'
EMAIL_PORT = 000
SERVER_EMAIL = ''
```
#### 8. Lancer le serveur
Créez un compte super-administrateur et importez les fichiers statiques.
```
cd ~/django_projectwebpage/
python manage.py collectstatic
python manage.py createsuperuser
```
Je vous recommande dans cette partie d'utiliser [Tmux](https://doc.ubuntu-fr.org/tmux) afin de visualiser les différents serveurs lancés pour mettre en place l'application.

Tout d'abord, il faut lancer le serveur Redis qui va permettre à Celery et le serveur Django de stocker des données de manière rapide et robuste sans passer par la base de données
```
redis-server
```
Ensuite, il faut lancer le serveur Celery qui va permettre à notre application de lancer des tâches de fond pour alléger le travail du serveur Django (exemple : introduire dans la base de données des documents et leurs sous-titres)
```
celery -A v0 worker -l info
```
Vous pouvez ensuite lancer le serveur Django.
```
sudo daphne v0.asgi:channel_layer --port 80 --bind 0.0.0.0
sudo python manage.py runworker
```
Nous avons donc 4 processus qui tournent en même temps. Vous pouvez lancer un navigateur sur l'adresse IP de votre serveur et vous connecter avec le compte super-administrateur que vous venez de créer.<br/>
`http://X.X.X.X/` - `http://X.X.X.X/admin`<br/>
Je ne détaille pas dans cette documentation la mise en place d'un DNS.

## Utilisation
Pour utiliser l'interface, il faut upload votre fichier audio ou vidéo et le fichier XML de contenue dans le répertoire `~/django_projectwabpage/static/data/`. [FileZilla](https://filezilla-project.org/) est une manière simple de procéder à cette étape.

Tout d'abord, le fichier XML contenant les sous-titres doit être sous un format spécifique. Les phrases doivent être séparées par des balises `<br/>` et chaque mot doit renseigner son temps de début et de fin.
```xml
<show>
	<word start="9.11" end="9.28">Hello</word>
	<word start="9.30" end="9.57">World,</word>
	<br/>
	<word start="10.01" end="10.18">my</word>
	<word start="10.22" end="10.34">name</word>
	<word start="10.37" end="10.45">is</word>
	<word start="10.51" end="11.02">RK</word>
	<br/>
</show>
```
Il faut donc upload le fichier audio (wav) ou le fichier vidéo (mp4) ainsi que le fichier contenant les sous-titres (XML) dans le répertoire `~/django_projectwabpage/static/data/` de votre application. **Attention, les deux fichiers doivent avoir le même nom (par exemple : file.mp4 et file.xml)**.
<br/><br/>
Pour éditer le document via l'interface web, il faut se rendre sur l'onglet `Add document` et renseigner le type de vidéo ainsi que le nom du fichier (exemple.mp4). `Celery` va alors s'occuper de traiter le parsing du fichier XML et de générer tous les fichiers dont l'interface a besoin pour permettre l'édition du document. Vous pourrez donc éditer le document qui sera présent dans votre page d'accueil.
<br/><br/>
Vous pouvez créer plusieurs comptes utilisateur via l'interface pour éditer un document en collaboration.
## License

This project is licensed under the [MIT License](https://en.wikipedia.org/wiki/MIT_License) - see the [LICENSE](LICENSE) file for details
```
{
    "type" : "delete",
    "user_id" : "1",
    "sentence_id" : "1",
}
```
