from channels import Group
from channels.sessions import channel_session
from django.contrib.auth.models import User
from authentification.models import Document, Sentence, Word, Locuteur
from backend.models import Historique
import json, re, math


user_room_dict = {}



# Connected to websocket.connect
@channel_session
def ws_connect(message):
    # on accepte la connexion
    message.reply_channel.send({"accept": True})

    # on recupere le nom du groupe en question (exemple: "edit19" -> edition sur le document avec l'id 19),
    room = message.content['path'].split('/', 2 )[2]
    user = message.content['path'].split('/', 2 )[1]  # id de l'utilisateur courant
    document = int(re.search(r'\d+$', room).group())  # id du document

    if room in user_room_dict:
        user_room_dict[room].append(user)
    else:
        user_room_dict[room] = []
        user_room_dict[room].append(user)

    # on enregistre le groupe, l'utilisateur et le document dans la session et on ajoute l'utilisateur au groupe
    message.channel_session['room'] = room
    message.channel_session['user'] = user
    message.channel_session['document'] = document
    Group(room).add(message.reply_channel)

    # on assigne cote serveur chaque sentence au bon correcteur
    # on supprime les doublons car un utilisateur peut etre connecte sur un meme document via plusieurs fenetres
    #user_without_doublon = []
    #for current_user in user_room_dict[message.channel_session['room']]:
        #if not current_user in user_without_doublon:
            #user_without_doublon.append(current_user)

    # on recupere le document, le nombe de ses sentences
    #sentences = Sentence.objects.filter(document__in = [Document.objects.get(id = int(message.channel_session['document']))]).order_by('start_time')
    #nb_sentences_affectee = math.floor(len(sentences) / len(user_without_doublon))
    #reste = len(sentences) % len(user_without_doublon)

    #for j, current_user in enumerate(user_without_doublon):
        #i = 0
        #while i < nb_sentences_affectee:
            #current = nb_sentences_affectee * j + i
            #sentence = sentences[current]
            #sentence.current_correcteur = User.objects.get(id = int(current_user))
            #sentence.save()
            #i += 1

        #if len(user_without_doublon) - 1 == j:
            #i = 1
            #while i <= reste:
                #sentence = sentences[len(sentences) - i]
                #sentence.current_correcteur = User.objects.get(id = int(current_user))
                #sentence.save()
                #i += 1

    # on renvoi dans le groupe de l'utilisateur, la liste des utilisateurs disponibles
    Group(room).send({
        "text": json.dumps({
            'type' : 'connect',
            'repartition' : user_room_dict[room]
        }),
    })



# Connected to websocket.receive
@channel_session
def ws_message(message):
    json_object = json.loads(message.content['text'])
    #json_object['type']  		-> type d'operation (valider, invalider, supprimer, ..., la sentence)
    #json_object['value'] 		-> nouvelle valeur de la sentence
    #json_object['time_start'] 	-> nouveau temps de debut
    #json_object['time_end'] 	-> nouveau temps de fin
    #json_object['user_id'] 	-> id de l'utilisateur qui fait la modification
    #json_object['sentence_id']	-> id de la phrase a modifier

    # permet de savoir si l'utilisateur qui modifie une sentence a le droit de le faire
    #if sentence.current_correcteur.id != json_object['user_id']:
        #return None

    if json_object['type'] != 'insert' and json_object['type'] != 'split':
        sentence = Sentence.objects.get(id = int(json_object['sentence_id']))

    historique = Historique()
    historique.user = User.objects.get(id = int(message.channel_session['user']))
    historique.document = Document.objects.get(id = int(message.channel_session['document']))
    historique.action = message.content['text']
    historique.save()

    # sentence inaudible
    if json_object['type'] == 'inaudible':
        sentence.inaudible = True
        sentence.save()

    # changement de locuteur
    if json_object['type'] == 'locuteur':
        sentence.locuteur = Locuteur.objects.get(id = int(json_object['locuteur_id']))
        sentence.save()

    # checkbox valid sentence
    if json_object['type'] == 'valid':
        sentence.valeur = json_object['value']
        sentence.start_time = json_object['time_start']
        sentence.end_time = json_object['time_end']
        sentence.validated = True
        sentence.save()

    # checkbox invalide sentence
    if json_object['type'] == 'invalid':
        sentence.validated = False
        sentence.save()

    # supprimer une phrase
    if json_object['type'] == 'delete':
        sentence.delete()

    # inserer une phrase
    if json_object['type'] == 'insert':
        document_id = int(re.search(r'\d+$', message.channel_session['room']).group())
        new_sentence = Sentence()
        new_sentence.valeur = ''
        new_sentence.start_time = json_object['time_start']
        new_sentence.end_time = json_object['time_end']
        new_sentence.validated = False
        new_sentence.document = Document.objects.get(id = int(document_id))
        #new_sentence.locuteur = Locuteur.objects.filter(document__in = [Document.objects.get(id = int(document_id))])[0]
        new_sentence.save()
        # on recupere le nouvelle id de la sentence pour le mettre a jours
        json_object['sentence_id'] = new_sentence.id

    # textarea onChange
    if json_object['type'] == 'edit_text':
        sentence.valeur = json_object['value']
        sentence.start_time = json_object['time_start']
        sentence.end_time = json_object['time_end']
        sentence.save()

    # textarea onChange
    if json_object['type'] == 'maj_time':
        sentence.start_time = json_object['time_start']
        sentence.end_time = json_object['time_end']
        sentence.save()

    # split d'une phrase en deux
    if json_object['type'] == 'split':
        document_id = int(re.search(r'\d+$', message.channel_session['room']).group())
        sentence1 = Sentence.objects.get(id = int(json_object['sentence_id1']))
        sentence1.start_time = json_object['time_start1']
        sentence1.end_time = json_object['time_end1']
        sentence1.valeur = json_object['value1']
        sentence1.save()

        sentence2 = Sentence()
        sentence2.valeur = json_object['value2']
        sentence2.start_time = json_object['time_start2']
        sentence2.end_time = json_object['time_end2']
        sentence2.document = Document.objects.get(id = int(document_id))
        #sentence2.locuteur = Locuteur.objects.get(id = int(json_object['locuteur_id']))
        sentence2.save()
        # on recupere le nouvelle id de la sentence pour le mettre a jours
        json_object['sentence_id2'] = sentence2.id
    
    if json_object['type'] == 'merge':
        sentence_to_remove = Sentence.objects.get(id = int(json_object['to_delete']))
        sentence.start_time = json_object['time_start']
        sentence.end_time = json_object['time_end']
        sentence.valeur = json_object['value']
        sentence.save()
        sentence_to_remove.delete()
   
    # on renvoi dans le groupe de l'utilisateur, le message qu'on a recus 
    Group(message.channel_session['room']).send({
        "text": json.dumps(json_object),
    })


# Connected to websocket.disconnect
@channel_session
def ws_disconnect(message):
    # message.channel_session['user'] --> user de l'utilisateur qui quitte le socket
    # message.channel_session['room'] --> room de l'utilisateur qui quitte le socket
    delete = 0

    for i, val in enumerate(user_room_dict[message.channel_session['room']]):
        if val == message.channel_session['user']:
            delete = i

    user_room_dict[message.channel_session['room']].pop(delete)
    Group(message.channel_session['room']).discard(message.reply_channel)

    # si il n'y a plus personne dans le channel, pas besoin d'envoyer un message 
    if len(user_room_dict[message.channel_session['room']]) == 0:
        return None

    # on assigne cote serveur chaque sentence au bon correcteur
    # on supprime les doublons car un utilisateur peut etre connecte sur un meme document via plusieurs fenetres
    #user_without_doublon = []
    #for current_user in user_room_dict[message.channel_session['room']]:
        #if not current_user in user_without_doublon:
            #user_without_doublon.append(current_user)

    # on recupere le document, le nombe de ses sentences
    #sentences = Sentence.objects.filter(document__in = [Document.objects.get(id = int(message.channel_session['document']))]).order_by('start_time')
    #nb_sentences_affectee = math.floor(len(sentences) / len(user_without_doublon))
    #reste = len(sentences) % len(user_without_doublon)
    
    #for j, current_user in enumerate(user_without_doublon):
        #i = 0
        #while i < nb_sentences_affectee:
            #current = nb_sentences_affectee * j + i
            #sentence = sentences[current]
            #sentence.current_correcteur = User.objects.get(id = int(current_user))
            #sentence.save()
            #i += 1

        #if len(user_without_doublon) - 1 == j:
            #i = 1
            #while i <= reste:
                #sentence = sentences[len(sentences) - i]
                #sentence.current_correcteur = User.objects.get(id = int(current_user))
                #sentence.save()
                #i += 1


    # on renvoi dans le groupe de l'utilisateur, la liste des utilisateurs disponibles
    Group(message.channel_session['room']).send({
        "text": json.dumps({
            'type' : 'disconnect',
            'repartition' : user_room_dict[message.channel_session['room']]
        }),
    })
















