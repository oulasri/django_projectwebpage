# -*- coding: utf-8 -*-
from django.contrib.auth.password_validation import validate_password
from django.contrib.auth.decorators import login_required
from django.contrib.auth.models import User, Group
from django.templatetags.static import static
from django.core.urlresolvers import reverse
from django.core.exceptions import ValidationError
from django.contrib.auth import authenticate, login, logout
from django.shortcuts import render, redirect
from django.core.mail import send_mail
from celery import shared_task
from datetime import timedelta
from xml.dom import minidom
from subprocess import call
import os, glob, json, srt
import urllib


from .tasks import addDocumentDatabase
from .models import Document, Collection, Sentence, Word, Locuteur
from .forms import ConnexionForm, UserForm, DocumentForm, UploadFileTest, EditDocumentForm



# fonction qui permet d'ecrire un fichier dans le dossier "static/data/[fichier]"
def handle_uploaded_file(f, user):
    # MYDIR permt de recuperer l'URL vers mon application courante
    MYDIR = os.path.dirname(os.path.dirname(__file__))

    # chemin_xml = /static/data/TEMPORAIRE[user.id][nom_du_fichier_xml]
    chemin_fichier = static('data/TEMPORAIRE' + str(user.id) + f.name)

    # si le fichier existe, pas besoin de le creer
    if os.path.exists(MYDIR + chemin_fichier):
        return

    # ecriture du fichier dans le repertoire /static/data/[fichier]
    with open(urllib.request.url2pathname(MYDIR + chemin_fichier), 'wb+') as destination:
        for chunk in f.chunks():
            destination.write(chunk)

    # on retourne le chemin des ficiers
    return urllib.request.url2pathname(chemin_fichier)




# connexion d'un utilisateur
def connexion(request):
    error = False

    # si un utilisateur est deja authentifie, il accede directement a sa collection de documents
    if request.user.is_authenticated:
        user = request.user
        collections = Collection.objects.filter(users__in = [request.user])
        documents = Document.objects.filter(users__in = [request.user])
        return render(request, 'authentification/collection.html', locals())

    if request.method == "POST":
        form = ConnexionForm(request.POST)
        if form.is_valid():
            # recuperation de l'utilisateur
            username = form.cleaned_data["username"]
            password = form.cleaned_data["password"]
            user = authenticate(username = username, password = password)  
            if user:  
                # Si il existe on l'enregistre et on charge ses donnees pour les afficher
                login(request, user)
                collections = Collection.objects.filter(users__in = [request.user])
                documents = Document.objects.filter(users__in = [request.user])
                return render(request, 'authentification/collection.html', locals())
            else: 
                # sinon une erreur sera affichee
                error = True
    else:
        # Si la requete est de type GET, on charge le formulaire
        form = ConnexionForm()

    return render(request, 'authentification/connexion.html', locals())




# deconnexion d'un utilisateur
def deconnexion(request):
    logout(request)
    return redirect(reverse(connexion))




# affichage de toute les collection d'un utilisateur
@login_required
def collection(request):
    one_collection = False
    collection_exist = False
    collection_created = False

    if request.method == 'POST':
        if not Collection.objects.filter(titre__iexact = request.POST['category_name']) and not request.POST['category_name'] == '':
            new_collection = Collection()
            new_collection.titre = request.POST['category_name']
            new_collection.save()
            new_collection.users.add(request.user)
            collection_created = True
        else:
            collection_exist = True



    # on recupere l'utilisateur et ses collections de documents
    user = request.user
    collections = Collection.objects.filter(users__in = [request.user])
    documents = Document.objects.filter(users__in = [request.user])


    return render(request, 'authentification/collection.html', locals())


# affichage d'une seul collection d'un utilisateur
@login_required
def collectionId(request, id_collection):
    one_collection = True

    # on recupere l'utilisateur et ses collections de documents
    user = request.user
    collections = Collection.objects.filter(users__in = [request.user])
    current_collection = Collection.objects.get(id = int(id_collection))
    documents = current_collection.documents.all()
    collection_id = id_collection

    return render(request, 'authentification/collection.html', locals())



# ajout d'un document
@login_required
def nouveauDocument(request):
    error_path_file = False
    error_path_xml_file = False

    if request.method == "POST":
        form = DocumentForm(request.POST)
        if form.is_valid():

            # on recupere les informations enregistrees dans le formulaire
            titre = form.cleaned_data["titre"]
            type_fichier = form.cleaned_data["type_fichier"]

            # MYDIR permet de recuperer l'URL vers mon application courante
            MYDIR = os.path.dirname(os.path.dirname(__file__))

            # si le document est deja en BD on ne l'ajoute pas, on creer juste le lien vers le nouvelle utilisateur
            document = Document.objects.filter(titre__in = [titre])
            if document:
                document[0].users.add(request.user)
                
                # on retourne a la vue collection
                collections = Collection.objects.filter(users__in = [request.user])
                documents = Document.objects.filter(users__in = [request.user])
                return render(request, 'authentification/collection.html', locals())

            # si le fichier wav n'existe pas il faut le creer
            if type_fichier == 'video' and not os.path.exists(MYDIR + static('data/' + titre.split('.', 1)[0] + ".wav")):
                call(['ffmpeg', '-i', MYDIR + static('data/' + titre), '-acodec', 'pcm_s16le', '-ac', '2', MYDIR + static('data/' +  titre.split('.', 1)[0] + ".wav")])
            

            # on test si les chemin vers nos fichiers existent
            if os.path.exists(MYDIR + static('data/' + titre)):
                if os.path.exists(MYDIR + static('data/' + titre.split('.', 1)[0] + ".xml")):
                    
                    # on recupere le fichier par rapport au chemin passe dans le formulaire
                    document = Document()
                    document.titre = titre
                    document.chemin_fichier = titre
                    document.chemin_xml_contenu = titre.split('.', 1)[0] + ".xml"
                    document.type_fichier = type_fichier
                    document.save()
                    document.users.add(request.user)
                    
                    # APPEL DE LA FONCTION ASYNCHRONE QUI PERMET DE PEUPLER LA BASE DE SENTENCES ET DE WORDS D'UN DOCUMENT
                    addDocumentDatabase.delay(document.id, document.chemin_xml_contenu)

                    # on retourne a la vue collection
                    collections = Collection.objects.filter(users__in = [request.user])
                    documents = Document.objects.filter(users__in = [request.user])

                    return render(request, 'authentification/collection.html', locals())
                else:
                    error_path_xml_file = True
            else:
                error_path_file = True

    else:
        # Si la requete est de type GET, on charge le formulaire
        form = DocumentForm()

    return render(request, 'authentification/newDocument.html', locals())





# visualisation TEST d'un document personnel
@login_required
def documentTest(request):
    user = request.user
    error_fichier_wav = False
    collection_view = False
    MYDIR = os.path.dirname(os.path.dirname(__file__))

    if request.method == 'POST':
        # suppression de l'ancien document de test de l'utilisateur courant (si celui-ci a deja effectue des tests)
        debut = 'TEMPORAIRE' + str(user.id)
        dir_scanne = MYDIR + static('data/')
        for file in os.listdir(dir_scanne):
            if os.path.isfile(os.path.join(dir_scanne, file)) and debut in file:
                os.remove(dir_scanne + file)

        # on recupere les informations du formulaire
        form = UploadFileTest(request.POST, request.FILES)
        if form.is_valid():
            # on recupere les fichiers du formulaire
            fichier = request.FILES['fichier']
            fichier_xml = request.FILES['fichier_xml']
            type_fichier = form.cleaned_data["type_fichier"]
            fichier_wav_video = form.cleaned_data["fichier_wav_video"]

            if (type_fichier == "video" and not fichier_wav_video):
                error_fichier_wav = True
                return render(request, 'authentification/newTestFile.html', locals())


            # on upload les fichier temporaire
            chemin_fichier = handle_uploaded_file(fichier, user)
            chemin_fichier_xml = handle_uploaded_file(fichier_xml, user)
            if (type_fichier == 'video'):
                chemin_fichier_wav_video = handle_uploaded_file(request.FILES['fichier_wav_video'], user)

            # on parse le fichier xml et on recupere toutes les phrases dans un tableau
            xmldoc = minidom.parse(MYDIR + chemin_fichier_xml)
            sentence_list = xmldoc.getElementsByTagName('sentence')
            sentences = []
            timeStart = []
            timeEnd = []
            cmpt = 0

            # on recupere toutes les phrases 
            for balise_sentence_xml in sentence_list:
                timeStart.append(balise_sentence_xml.getAttribute("startTime"))
                timeEnd.append(balise_sentence_xml.getAttribute("endTime"))
                for word in balise_sentence_xml.getElementsByTagName('word'):
                    if len(sentences) <= cmpt:
                        temp = word.firstChild.nodeValue
                    else:
                        temp = sentences.pop(cmpt)
                        temp = temp + ' ' + word.firstChild.nodeValue
                    sentences.insert(cmpt, temp)
                cmpt = cmpt + 1
            
            zipped = zip(timeStart, timeEnd, sentences)

            # chemin du futur fichier .wf qui va servir a creer le waveform
            if (type_fichier == 'audio'):
                wf_file = chemin_fichier.split('.', 1)[0] + ".wf"
            else:
                wf_file = chemin_fichier_wav_video.split('.', 1)[0] + ".wf"

            # si le fichier .wf n'existe pas, il faut le creer
            if not os.path.exists(MYDIR + wf_file):
                outwave_c = MYDIR + static('c/outwave')
                if (type_fichier == 'audio'):
                    in_wav = MYDIR + chemin_fichier.split('.', 1)[0] + ".wav"
                else:
                    in_wav = MYDIR + chemin_fichier_wav_video.split('.', 1)[0] + ".wav"

                # Cette fonction nous permet de creer le fichier .wf a partir du fichier .wav
                call([outwave_c, '-s 8', '--mono', '--nosum', '-r 16k', in_wav, MYDIR + wf_file])

            return render(request, 'authentification/document.html', locals())
    else:
        form = UploadFileTest()
    return render(request, 'authentification/newTestFile.html', locals())



# generer un fichier srt
@login_required
def generateSrt(request, id_document):
    user = request.user
    document = Document.objects.get(id = int(id_document))
    
    # MYDIR peremt de recuperer l'URL vers mon application courante
    MYDIR = os.path.dirname(os.path.dirname(__file__))

    # on recupere toutes les phrases et les locuteurs du document courant
    sentences = Sentence.objects.filter(document__in = [document]).order_by('start_time')
    srt_name = document.chemin_fichier.split('.', 1)[0] + ".srt"

    # chemin du futur fichier .srt
    subs = []
    i = 0
    for sentence in sentences:
        subs.append(srt.Subtitle(index=i, start=timedelta(seconds=sentence.start_time), end=timedelta(seconds=sentence.end_time), content=sentence.valeur))
        i = i + 1
    subtitles = srt.compose(subs)             

    # ecriture dans le fichier .srt
    with open(MYDIR + static('/data/' + srt_name), 'w') as srt_file:
        srt_file.write(subtitles)
    
    generationSrt = True 
    return render(request, 'authentification/documentResume.html', locals())


# visualisation d'un document
@login_required
def document(request, id_document):
    # on recupere l'utilisateur et ses collections de documents
    user = request.user
    document = Document.objects.get(id = int(id_document))

    # on test si le document est entierement uploader par la tache lance en parrallele par Celery
    if not document.uploaded:
        return render(request, 'authentification/documentInProgress.html', locals())

    # MYDIR peremt de recuperer l'URL vers mon application courante
    MYDIR = os.path.dirname(os.path.dirname(__file__))

    # on recupere toutes les phrases et les locuteurs du document courant
    sentences = Sentence.objects.filter(document__in = [document]).order_by('start_time')
    locuteurs = Locuteur.objects.filter(document__in = [document])

    # chemin du futur fichier .wf qui va servir a creer le waveform
    wf_file = '/data/' + document.chemin_fichier.split('.', 1)[0] + ".wf"

    # si le fichier .wf n'existe pas, il faut le creer
    if not os.path.exists(MYDIR + static(wf_file)):
        outwave_c = MYDIR + static('/c/outwave')
        in_wav = MYDIR + static('/data/' + document.chemin_fichier.split('.', 1)[0] + ".wav")

        # Cette fonction nous permet de creer le fichier .wf a partir du fichier .wav
        call([outwave_c, '-s 8', '--mono', '--nosum', '-r 16k', in_wav, MYDIR + static(wf_file)])

    collection_view = True
    type_fichier = document.type_fichier
    chemin_fichier = 'data/' + document.chemin_fichier
    return render(request, 'authentification/document.html', locals())



# visualisation d'un document par un validateur
@login_required
def validateurView(request, id_document):
    # on recupere l'utilisateur et ses collections de documents
    user = request.user
    document = Document.objects.get(id = int(id_document))

    # on test si le document est entièrement uploader par la tache lance en parrallele par Celery
    if not document.uploaded:
        return render(request, 'authentification/documentInProgress.html', locals())

    # liste des correcteurs qui ont les droit de corrections sur le document 
    # et liste de tous les correcteurs
    correcteurs = document.users.filter(groups__name='correcteur')
    all_users = User.objects.filter(groups__name='correcteur')

    # sentences liée au document courant
    sentences = Sentence.objects.filter(document__in = [document])
    pourcentage = format((sentences.filter(validated=True).count() * 100) / sentences.all().count(), '.2f')

    return render(request, 'authentification/documentResume.html', locals())




# nouvelle utilisateur
def nouveauCompte(request):
    error_username = False
    error_password = False
    error_email = False

    #if request.user.is_authenticated:
        #return render(request, 'authentification/collection.html', locals())

    if request.method == "POST":
        form = UserForm(request.POST)
        if form.is_valid():
            username = form.cleaned_data["username"]
            first_name = form.cleaned_data["first_name"]
            last_name = form.cleaned_data["last_name"]
            email = form.cleaned_data["email"]
            password1 = form.cleaned_data["password1"]
            password2 = form.cleaned_data["password2"]

            # Si les mots de passe sont identiques, on verifie l'email
            if password1 == password2:

                # Si le nom d'utilisateur est deja utilise
                if not User.objects.filter(username__iexact = username):

                    # Si l'email n'est pas deja utilise, on l'enregistre
                    if not User.objects.filter(email__iexact = email):
                        new_user = User.objects.create_user(username, email, password1)
                        new_user.first_name = first_name
                        new_user.last_name = last_name
                        new_user.is_active = False
                        new_user.save()
                        
                        groupe_correcteur = Group.objects.get(name='correcteur')
                        groupe_correcteur.user_set.add(new_user)

                        # envoi du mail de validation du compte
                        email_content = "http://5.135.187.138/authentification/confirm/" + str(new_user.id)
                        send_mail('Verification de compte authot', email_content, 'authot.acc@gmail.com', [new_user.email], fail_silently=False)
                        return render(request, 'authentification/confirmation.html', locals()) 
                    else:
                        error_email = True
                else:
                    error_username = True
            else:
                error_password = True
    else:
        # Si la requete est de type GET, on charge le formulaire
        form =  UserForm()

    return render(request, 'authentification/newUser.html', locals()) 




# page de confirmation de creation de nouveau compte
def confirmation(request):
    return render(request, 'authentification/confirmation.html', locals()) 




# page d'activation du nouveau compte selon un id
def confirmationId(request, id_user):
    validation = True

    user_to_activate = User.objects.get(id = int(id_user))
    user_to_activate.is_active = True
    user_to_activate.save()
    return render(request, 'authentification/validation.html', locals())




# page d'edition de collection
@login_required
def editCollection(request, id_collection):
    collection = Collection.objects.get(id = int(id_collection))
    documents = Document.objects.filter(users__in = [request.user])

    if request.method == "POST":
        collection.titre = request.POST['titre']
        collection.save()

        collections = Collection.objects.filter(users__in = [request.user])
        documents = Document.objects.filter(users__in = [request.user])
        return redirect('../../collection')

    return render(request, 'authentification/editCollection.html', locals())




# page de suppression d'une collection pour un utilisateur
@login_required
def deleteCollection(request, id_collection):
    collection = Collection.objects.get(id = int(id_collection))
    collection.users.remove(request.user)

    # on retourne a la vue collection
    collections = Collection.objects.filter(users__in = [request.user])
    documents = Document.objects.filter(users__in = [request.user])
    return render(request, 'authentification/collection.html', locals())




# page d'edition d'un document
@login_required
def editDocument(request, id_document):
    file_name_invalid = False
    document = Document.objects.get(id = int(id_document))
    MYDIR = os.path.dirname(os.path.dirname(__file__))
           
    if request.method == "POST":
        form = EditDocumentForm(request.POST)
        if form.is_valid():
            titre = form.cleaned_data["titre"]
            client = form.cleaned_data["client"]

            if document.titre == titre:
                document.client = client
                document.save()
                return redirect('../../collection')
            else:
                if not Document.objects.filter(titre__in = [titre]):

                    # on renomme aussi tous les fichiers dans le dossier static
                    for filename in glob.glob(MYDIR + static('data/' + document.titre + ".*")):
                        new_name = MYDIR + static('data/' + titre + os.path.splitext(filename)[1])
                        os.rename(filename, new_name)

                    document.titre = titre
                    document.client = client
                    document.save()
                    return redirect('../../collection')
                else:
                    invalid_file_name = True
    else:
        # Si la requete est de type GET, on charge le formulaire
        form =  EditDocumentForm(initial={'titre': document.titre, 'client': document.client})

    return render(request, 'authentification/editDocument.html', locals())





# suppression d'un document
@login_required
def deleteDocument(request, id_document):
    document = Document.objects.get(id = int(id_document))
    document.users.remove(request.user)

    # on retourne a la vue collection
    collections = Collection.objects.filter(users__in = [request.user])
    documents = Document.objects.filter(users__in = [request.user])
    return render(request, 'authentification/collection.html', locals())




# gestion des correcteurs d'un document
@login_required
def addCorrecteur(request, id_document):
    document = Document.objects.get(id = int(id_document))


    if request.method == "POST":
        for id_user in json.loads(request.POST['correcteurs']):
            user = User.objects.get(id = int(id_user))
            document.users.add(user)

        for id_user in json.loads(request.POST['others']):
            user = User.objects.get(id = int(id_user))
            document.users.remove(user)

    document.save()

    # on retourne a la vue collection
    collections = Collection.objects.filter(users__in = [request.user])
    documents = Document.objects.filter(users__in = [request.user])
    return render(request, 'authentification/collection.html', locals())






# validation d'un document
@login_required
def validateDocument(request, id_document):
    document = Document.objects.get(id = int(id_document))
    document.validated = True
    document.save()

    # on retourne a la vue collection
    collections = Collection.objects.filter(users__in = [request.user])
    documents = Document.objects.filter(users__in = [request.user])
    return render(request, 'authentification/collection.html', locals())




# validation d'un document
@login_required
def dashboard(request):
    user = request.user
    bad_password = False
    not_same_password = False
    error = False
    error_list = []
    password_changed = False

    if request.method == 'POST':
        old_password = request.POST['old_password']
        new_password = request.POST['new_password']
        new_password_confirm = request.POST['new_password_confirm']


        if not user.check_password(old_password):
            bad_password = True
            error = True

        if not new_password == new_password_confirm:
            not_same_password = True
            error = True

        if not bad_password and not not_same_password:
            try: 
                validate_password(password=new_password, user=request.user)
                user.set_password(new_password)
                user.save()
                password_changed = True    
            except ValidationError as e:
                error = True
                error_list = e
        
    return render(request, 'authentification/dashboard.html', locals())









