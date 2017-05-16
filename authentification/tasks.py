from django.templatetags.static import static
from .models import Document, Sentence, Word, Locuteur
from celery import shared_task
from xml.etree import ElementTree
import os, sys

reload(sys)
sys.setdefaultencoding("utf-8")



@shared_task
def addDocumentDatabase(document_id, chemin_xml):
    # MYDIR permet de recuperer l'URL vers mon application courante
    MYDIR = os.path.dirname(os.path.dirname(__file__))

    with open(MYDIR + static('data/' + chemin_xml) ) as xmlfile:
    	data = xmlfile.read().encode('utf-8')

    # on met le fichier xml au bon format
    data = data.replace('iso8859', 'utf-8')
    data = data.decode('utf8').encode('utf-8', errors='ignore')

    root = ElementTree.fromstring(data)
    document = Document.objects.get(id = int(document_id))
    first_word = True
    align = False    

    current_sentence = Sentence()
    last_start = 0.0
    last_end = 0.0 
    start = 0.0
    end = 0.0

    # peupler la base des sentences et words
    for word in root.getiterator():
        if word.tag == "br":
            if last_end >= start:
                start = last_end + 0.1
            if start >= end:
                end = start + 0.1
            
            last_start = start
            last_end = end

            current_sentence.document = document
            current_sentence.start_time = start
            current_sentence.end_time = end
            current_sentence.save()
            current_sentence = Sentence()
	    first_word = True
            align = False
       
        if word.tag == "word":
            # si la phrase courrante est trop longue, on la coupe
            if len(current_sentence.valeur) >= 78:
                if last_end >= start:
                    start = last_end + 0.1
                if start >= end:
                    end = start + 0.1

                last_start = start
                last_end = end

                current_sentence.document = document
                current_sentence.start_time = start
                current_sentence.end_time = end
                current_sentence.save()
                current_sentence = Sentence()
                first_word = True
                align = False

            # retour a la ligne pour la deuxieme phrase
            if len(current_sentence.valeur) >= 39 and not align:
                current_sentence.valeur = current_sentence.valeur + "\n" +  word.text
                align = True
            else:
                current_sentence.valeur = current_sentence.valeur +  word.text
            
            end = float(word.get("end"))
            if first_word:
                start = float(word.get("start"))
                first_word = False           
   

    if last_end >= start:
        start = end + 0.1
    if start >= end:
        end = start + 0.1
    
    current_sentence.document = document
    current_sentence.start_time = start
    current_sentence.end_time = end
    current_sentence.save()

    document.uploaded = True
    document.save()
    return None
