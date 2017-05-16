// ----  Connexion en websocket avec le BACKEND ----- //
if (documentView) {
    var socket;
    var url = window.location.pathname;
    var id = url.substring(url.lastIndexOf('/') + 1);


    socket = new WebSocket("ws://" + window.location.host + "/" + userId + "/edit" + id);
}


window.onresize = function(event) {
    $('#div_sentences').css('max-height',10);
    max = $(document).height() - $('#div_sentences').offset().top - 50;
    $('#div_sentences').css('max-height',max);
};


// ---- fonctions de mise à jours de l'affichage ----- //
$("#sous-titres_flottant").draggable();
max = $(document).height() - $('#div_sentences').offset().top - 50;
$('#div_sentences').css('max-height',max);

var previous;
var timer1, timer2;
var collection;
var last_time_span;

// fonction qui permet de filtrer la phrase courrante pour l'afficher en surbrillance
jQuery.fn.filterCurrentTime = function(item, time){
    return this.filter(function(){
        var value_start = +$(this).attr("timeStart");
        var value_end = +$(this).attr("timeEnd");
        return value_start <= time && value_end >= time;
    });
};

// fonction qui permet de filtrer les autres phrases afin de les afficher normalement
jQuery.fn.filterCurrentTimeReverse = function(item, time){
    return this.filter(function(){
        var value_start = +$(this).attr("timeStart");
        var value_end = +$(this).attr("timeEnd");
        return value_start > time || value_end < time;
    });
};


// changement de locuteur
$('.select_locuteur').change(function() {
    // ======== WEBSOCKET - ENREGISTRER EN BASE DE DONNEES ======== //
    if (documentView){
        socket.send(JSON.stringify({
            type: 'locuteur',
            sentence_id: $(this).parent().parent().attr('sentence_id'),
            locuteur_id: $(this).find(":selected").attr('value'),
            user_id: userId,
        }));
    }
});




function majCursorWaveform() {
    outwave.setCursor(video_player.currentTime);

    // parcourt des balises de transcription pour mettre en avant la phrase courrante
    // et la deuxieme ligne sert a mettre en mode normal les autres phrases
    var textarea = $("textarea").filterCurrentTime("time", video_player.currentTime);
    $("textarea").filterCurrentTimeReverse("time", video_player.currentTime).addClass("textarea_basic");
    $("textarea").filterCurrentTimeReverse("time", video_player.currentTime).removeClass("textarea_selected");

    // on met en evidence le bon sous-titre
    textarea.addClass("textarea_selected");
    if (textarea.val() == undefined){
        $("#sous-titres_flottant").text(" ");
        if (last_time_span != undefined) {
            last_time_span.getStartElement().removeClass("outwave_timespan_selected");
            last_time_span.getEndElement().removeClass("outwave_timespan_selected");
            last_time_span = null;
        }
    } else {
        // MAJ du sous-titre flottant
        $("#sous-titres_flottant").text(textarea.val());

        // MAJ graphique du debut et fin de la region de flux audio courant
        current_time_span = collection.getTimeSpanAtPosition(textarea.attr("timeStart"));
        if (current_time_span != last_time_span){
            current_time_span.getStartElement().addClass("outwave_timespan_selected");
            current_time_span.getEndElement().addClass("outwave_timespan_selected");
            var sentence_to_scroll = textarea.parent();

            $("#div_sentences").animate({ 
                scrollTop: sentence_to_scroll.offset().top - $("#div_sentences").offset().top + $("#div_sentences").scrollTop() - 30
            });

            if (last_time_span != undefined){
                last_time_span.getStartElement().removeClass("outwave_timespan_selected");
                last_time_span.getEndElement().removeClass("outwave_timespan_selected"); 
            }
            last_time_span = current_time_span;
        }

    }

    // on affiche les bouttons divers de la phrase courante
    if (textarea.attr("timeStart") != undefined){
        play_span = document.getElementById("play_sentence_" + textarea.attr("timeStart"));
        // on cache le précedent bouton play
        if (previous != undefined){
            previous.style.visibility = "hidden";
        }
        play_span.style.visibility = "visible";
        previous = play_span;
    } else {
        if (previous != undefined){
            previous.style.visibility = "hidden";
        }
    }
}



// ---- initialisation et appel de la mise à jours de l'affichage ----- //
// initialisation du waveform et du video player
var file_wf = $('#waveform_wf').attr('waveformFile');
var video_player = document.getElementById("video_player");
var options_wf = {
    autoScroll: true, 
    zoom: 20, 
    autoScrollType: 'jumpy-animated',
    autoScrollAnimationDuration: 600
};

// utiliser viewer pour manipuler le waveform et recuperer les evenements
Outwave(file_wf, $("#waveform_wf"), options_wf, function(viewer){
    window.outwave = viewer;
    viewer.onClick(function(time){
	    video_player.currentTime = time;

	    var textarea_selected = $("textarea").filterCurrentTime("time", time); 	
        if (textarea_selected.val() != undefined){
            var sentence_to_scroll = textarea_selected.parent();

            $("#div_sentences").animate({ 
                scrollTop: sentence_to_scroll.offset().top - $("#div_sentences").offset().top + $("#div_sentences").scrollTop() - 30
            }); 
        }
    });

    // on rajoute les zone de phrase sur le waveform
    collection = new SparseTimeSpanCollection(outwave); 
    var dic_tim_span = {};
    var last_end_sentence = 0.0;

    // boucle qui permet d'afficher les timespan dans le waveform pour chaque phrase
    jQuery('.input-group').each(function() {
        time_start = parseFloat($(this).attr("timeStart"));
        time_end = parseFloat($(this).attr("timeEnd"));
        merge_span = document.getElementById("merge_sentence_" + $(this).attr("timeStart"));
        play_span = document.getElementById("play_sentence_" + $(this).attr("timeStart"));
        valid_span = document.getElementById("valid_sentence_" + $(this).attr("timeStart"));
        
        // on vérifie si les zone ne se chevauchent pas
        if (last_end_sentence >= time_start){
            time_start = last_end_sentence + 0.1;
        }

        // et si il n'y a pas de beuge dans le fichier xml
        if (time_start < time_end){
            var timeSpan = collection.addTimeSpan(time_start, time_end); 
            timeSpan.onPositionChanged(function(start, end){
                MAJtimespan(start, end);
            });
            timeSpan.onClick(function(start, end){
                sendMajTimeSpan(start, end);
            });
        }

        var span = $(this).children().first();
        var textarea = $(this).children().last(); 
        time_start = time_start.toString(); 


        // on met à jours les affichage avec les bon temps
        $(this).attr("id", "sentence_" + time_start);
        $(this).attr("timeStart", time_start);
        textarea.attr("timeStart", time_start);

        // affichage du temps des transcriptions
        format_time(span, time_start, time_end, 'jq');

        // on met à jours l'appel aux fonctions qui permettront de merger et de lire la phrase courante
        merge_span.setAttribute("onclick", "mergeSpan(" + time_start + "," + time_end + ");");
        play_span.setAttribute("onclick", "inaudibleSentence(" + $(this).attr("sentence_id") + ");");
        valid_span.setAttribute("onclick", "validSentence(this," + time_start + ");");
        merge_span.setAttribute("id", "merge_sentence_" + time_start);
        play_span.setAttribute("id", "play_sentence_" + time_start);
        valid_span.setAttribute("id", "valid_sentence_" + time_start);
        
        last_end_sentence = time_end;
    });
});

// On recupere le temps courant de la video pour mettre a jours les differents elements de l'interface
video_player.ontimeupdate = function() {majCursorWaveform();}
video_player.onclick = function() {
}


// fonction qui permet de récupérer le clic sur le bouton play d'une sentence
function playSpan(time_start, time_end){
    clearTimeout(timer1);
    clearTimeout(timer2);
    video_player.currentTime = time_start;
    pause = video_player.paused;

    if (pause == true){
        video_player.play();
    }

    timer1 = setTimeout(function(){ video_player.currentTime = time_start; }, ((time_end - time_start + 1) * 1000));
    timer2 = setTimeout(function(){ 
        video_player.currentTime = time_start; 
        video_player.pause();
    }, ((time_end - time_start + 1) * 1000) * 2);

}



// fonction appelée lorsque l'on se focus sur une phrase précise
// on doit donc mettre à jours l'affichage
function focusSentence(element){
    clearTimeout(timer1);
    clearTimeout(timer2);
    video_player.currentTime = parseFloat(element.getAttribute("timeStart")) + 0.1;
    var textarea_selected = $("textarea").filterCurrentTime("time", video_player.currentTime);
    textarea_selected.focus();
}


// fonction qui permet de definir une sentence comme inaudible
function inaudibleSentence(id){
    // ======== WEBSOCKET - ENREGISTRER EN BASE DE DONNEES ======== //
    if (documentView){
        socket.send(JSON.stringify({
            type: 'inaudible',
            user_id: userId,
            sentence_id: id
        }));
    }
}

// fonction qui permet de mettre à jours le temps des time_span dans l'interface client
function MAJtimespan(time_start, time_end){    
    var div = $("div[id='sentence_"+time_start+"']");

    if (div.length == 0) {
        div = $("div[timeEnd='"+time_end+"']");
    }

    time = div.children().first();
    merge_span = time.next();
    play_span = merge_span.next();
    input = play_span.next();
    textarea = input.next();

    // MAJ des temps de la sentence
    div.attr("id", "sentence_" + time_start);
    div.attr("timeStart", time_start);
    div.attr("timeEnd", time_end);

    merge_span.children().first().attr("id", "merge_sentence_" + time_start);
    play_span.children().first().attr("id", "play_sentence_" + time_start);
    input.attr("id", "valid_sentence_" + time_start);
    textarea.attr("timeStart", time_start);
    textarea.attr("timeEnd", time_end);

    merge_span.children().first().attr("onclick", "mergeSpan(" + time_start + "," + time_end + ");");
    play_span.children().first().attr("onclick", "inaudibleSentence(" + div.attr("sentence_id") + ");");
    input.attr("onclick", "validSentence(this," + time_start + ");");

    // MAJ graphique
    format_time(time, time_start, time_end, 'jq');
}


// fonction qui permet d'envoyer la mise a jour du temps des times span au serveur
function sendMajTimeSpan(start, end){
    // ======== WEBSOCKET - ENREGISTRER EN BASE DE DONNEES ======== //
    if (documentView){
        socket.send(JSON.stringify({
            type: 'maj_time',
            time_start: start,
            time_end: end,
            user_id: userId,
            sentence_id: document.getElementById("sentence_" + start).getAttribute('sentence_id')
        }));
    }
}



// ---- MERGE SPLIT ET VALIDATION DE SOUS-TITRES ----- //
// fonction qui permet de merger les spans
function mergeSpan(time_start, time_end){
    clearTimeout(timer1);
    clearTimeout(timer2);

    merge1 = $("div[id='sentence_"+time_start+"']");
    merge2 = merge1.next();
    textarea1 = $("textarea[timeStart='"+ time_start +"']" );
    textarea2 = $("textarea[timeStart='"+ merge2.attr("timeStart") +"']" );

    time_end = merge2.attr("timeEnd");
    to_delete = document.getElementById("sentence_" + merge2.attr("timeStart")).getAttribute('sentence_id');
    sentence_id =  document.getElementById("sentence_" + time_start).getAttribute('sentence_id');

    // MAJ du waveform
    span_merge2 = collection.getTimeSpanAtPosition(merge2.attr("timeStart"));
    collection.mergeWithPrev(span_merge2);

    collection.getTimeSpanAtPosition(time_start).onPositionChanged(function(start, end){
        MAJtimespan(start, end);
    });
    collection.getTimeSpanAtPosition(time_start).onClick(function(start, end){
        sendMajTimeSpan(start, end);
    });

    // MAJ graphique
    textarea1.val(textarea1.val() + " " +textarea2.val());
    textarea1.attr("timeEnd", time_end);
    merge1.attr("timeEnd", time_end);

    format_time(merge1.children().first(), time_start, time_end, 'jq');
    merge2.remove();

    // MAJ du bouton play et merge
    play_span = document.getElementById("play_sentence_" + time_start);
    merge_span = document.getElementById("merge_sentence_" + time_start);
    play_span.setAttribute("onclick",  "inaudibleSentence(" + sentence_id + ");");
    merge_span.setAttribute("onclick", "mergeSpan(" + time_start + "," + time_end + ");");

    // MAJ graphique du pourcentage
    MAJpourcentage();


    // ======== WEBSOCKET - ENREGISTRER EN BASE DE DONNEES ======== //
    if (documentView){
        socket.send(JSON.stringify({
            type: 'merge',
            time_start: time_start,
            time_end: time_end,
            value: textarea1.val(),
            sentence_id: document.getElementById("sentence_" + time_start).getAttribute('sentence_id'),
            to_delete: to_delete,
            user_id: userId,
        }));
    }
}




// function qui permet de pliter les sous-titres
function split(textarea, indice_split, time_start, time_end, time_split){
    var split1 = textarea.val().substring(0, indice_split);
    var split2 = textarea.val().substring(indice_split);

    collection.split(time_split);

    var new_span1 = collection.getTimeSpanAtPosition(time_start);
    new_span1.onPositionChanged(function(start, end){
        MAJtimespan(start, end);
    });
    new_span1.onClick(function(start, end){
        sendMajTimeSpan(start, end);
    });
    var new_span2 = collection.getTimeSpanAtPosition(time_end);
    new_span2.onPositionChanged(function(start, end){
        MAJtimespan(start, end);
    });
    new_span2.onClick(function(start, end){
        sendMajTimeSpan(start, end);
    });

    // ---- Mise à jours de la première partie du split ---- //
    // on met a jours la premiere partie du split
    textarea.val(split1);
    textarea.attr('timeEnd', time_split);

    // mise à jours de l'affichage du temps de la premiere partie du split
    var div = textarea.parent();
    div.attr('timeEnd', time_split);
    format_time(div.children().first(), time_start, time_split, 'jq');

    merge_span = document.getElementById("merge_sentence_" + time_start);
    play_span = document.getElementById("play_sentence_" + time_start);
    valid_span = document.getElementById("valid_sentence_" + time_start);

    // on met à jours l'appel aux fonctions qui permettront de merger et de lire la phrase courante
    merge_span.setAttribute("onclick", "mergeSpan(" + time_start + "," + time_split + ");");
    play_span.setAttribute("onclick", "inaudibleSentence(" + document.getElementById("sentence_" + time_start).getAttribute('sentence_id') + ");");
    valid_span.setAttribute("onclick", "validSentence(this," + time_start + ");");
    merge_span.setAttribute("id", "merge_sentence_" + time_start);
    play_span.setAttribute("id", "play_sentence_" + time_start);
    valid_span.setAttribute("id", "valid_sentence_" + time_start);



    // ---- Création de la deuxième partie du split ---- //
    temp_for_socket = time_split;
    time_split = parseFloat(time_split + 0.01);
    $("<div id='sentence_"+time_split+"' class='input-group' timeStart='"+time_split+"' timeEnd='"+time_end+"' sentence_id='-1'>"
        +"<span class='input-group-addon' id='sizing-addon3' style='position: relative;'>"
            +"<div style='top: 6px;'></div></br>"
            +"<select id='locuteur_select_-1' class='select_locuteur'></select>"
        +"</span>"
        +"<div class='merge_transcription'>"
            +"<span id='merge_sentence_"+time_split+"' "
            +"class='glyphicon glyphicon-resize-vertical'"
            +"style='cursor: pointer;' tabindex='0'></span>"
        +"</div>"
        +"<div class='play_transcription' style='visibility: hidden;'>"
            +"<a id='play_sentence_"+time_split+"'>"
                +"<span class='glyphicon glyphicon-warning-sign' style='cursor: pointer;'></span>"
            +"</a>"
        +"</div>"
        +"<input type='checkbox' class='valid_transcription' id='valid_sentence_"+time_split+"'>"
        +"<textarea class='textarea_basic'"
            +"timeStart='"+time_split+"'"
            +"timeEnd='"+time_end+"'"
            +"ondblclick='focusSentence(this);'>"+split2+"</textarea>"
    +"</div>").insertAfter(div);
    $("<!--  -->").insertAfter(div);


    format_time(div.next().children(":first"), time_split, time_end, 'jq');
    merge_span = document.getElementById("merge_sentence_" + time_split);
    play_span = document.getElementById("play_sentence_" + time_split);
    valid_span = document.getElementById("valid_sentence_" + time_split);
    
    // on met à jours l'appel aux fonctions qui permettront de merger et de lire la phrase courante
    merge_span.setAttribute("onclick", "mergeSpan(" + time_split + "," + time_end + ");");
    valid_span.setAttribute("onclick", "validSentence(this," + time_split + ");");


    // MAJ graphique du pourcentage
    MAJpourcentage();
    $("#locuteur_select_-1").append(textarea.parent().children(':first').children(':last').children().clone());

    $("#locuteur_select_-1").change(function() {
        // ======== WEBSOCKET - ENREGISTRER EN BASE DE DONNEES ======== //
        if (documentView){
            socket.send(JSON.stringify({
                type: 'locuteur',
                sentence_id: $(this).parent().parent().attr('sentence_id'),
                locuteur_id: $(this).find(":selected").attr('value'),
                user_id: userId,
            }));
        }
    });


    // ======== WEBSOCKET - ENREGISTRER EN BASE DE DONNEES ======== //
    if (documentView){
        socket.send(JSON.stringify({
            type: 'split',
            time_start1: time_start,
            time_end1: temp_for_socket,
            value1: split1,
            sentence_id1: document.getElementById("sentence_" + time_start).getAttribute('sentence_id'),

            time_start2: time_split,
            time_end2: time_end,
            value2: split2,
            sentence_id2: "-1",
            
            user_id: userId,
            locuteur_id: $("#locuteur_select_" + document.getElementById("sentence_" + time_start).getAttribute('sentence_id')).val(), 
        }));
    }

    return document.getElementById("sentence_"+time_split);
}




// fonction qui permet de valider une sentence avec le checkbox
function validSentence(element, time_start){
    MAJpourcentage();

    // ======== WEBSOCKET - ENREGISTRER EN BASE DE DONNEES ======== //
    if (documentView){
        var div = $("div[id='sentence_"+ time_start +"']");
        var textarea = div.children().last();
        if (element.checked && div.length != 0){
            socket.send(JSON.stringify({
                type: 'valid',
                value: textarea.val(),
                time_start: textarea.attr('timeStart'),
                time_end: textarea.attr('timeEnd'),
                user_id: userId,
                sentence_id: textarea.parent().attr('sentence_id')
            }));
        } else {
            socket.send(JSON.stringify({
                type: 'invalid',
                user_id: userId,
                sentence_id: textarea.parent().attr('sentence_id')
            }));
        }
    }
}



// fonction qui permet de supprimer une phrase
function deleteSpan(element){
    // ======== WEBSOCKET - ENREGISTRER EN BASE DE DONNEES ======== //
    if (documentView){
        socket.send(JSON.stringify({
            type: 'delete',
            user_id: userId,
            sentence_id: element.parent().attr('sentence_id')
        }));
    }

    // MAJ graphique
    var span = collection.getTimeSpanAtPosition(element.attr('timeStart'));
    collection.removeTimeSpan(span);

    element.parent().remove();
    MAJpourcentage();
}



// fonction qui permet d'inserer une phrase à un moment voulu
function insertSpan(time, event){
    start = time;
    end = time + 0.5;

    // permet de savoir si il y a de la place pour ajouter une phrase
    // si la phrase suivante n'est pas a un centieme de seconde de celle que l'on veut ajouter
    if (collection.getTimeSpanAtPosition(time + 1) != undefined) {
        $("#information").empty();
        $("#information").append("<div class='alert alert-warning alert-dismissible' role='alert'><button type='button' class='close' data-dismiss='alert' aria-label='Close'><span aria-hidden='true'>&times;</span></button><strong>Warning!</strong> Phrase suivante trop proche pour insérer une nouvelle phrase.</div>");
        event.preventDefault();
        return false;
    }
    var first = $("#div_sentences").children(':first');
    // creation de la div
    var div = createDiv(-1, start, end, 'enable');
    MAJpourcentage();

    // ======== WEBSOCKET - ENREGISTRER EN BASE DE DONNEES ======== //
    if (documentView){
        socket.send(JSON.stringify({
            type: 'insert',
            time_start: start,
            time_end: end,
            user_id: userId,
            sentence_id: -1
        }));
    }
    event.preventDefault();
}


// fonction qui permet d'envoyer un mesage au serveur via un websocket lorsqu'une phrase a finit d'etre modifie
$("textarea").focusout(function(event){
    // annule l'edition si on merge juste après    
    if(!$(event.relatedTarget).hasClass("glyphicon-resize-vertical")) {
        // ======== WEBSOCKET - ENREGISTRER EN BASE DE DONNEES ======== //
        if (documentView){
            socket.send(JSON.stringify({
                type: 'edit_text',
                value: $(this).val(),
                time_start: $(this).attr('timeStart'),
                time_end: $(this).attr('timeEnd'),
                user_id: userId,
                sentence_id: $(this).parent().attr('sentence_id')
            }));
        }
    }
});


function MAJpourcentage(){
    var pourcentage = "" + ($('input:checkbox:checked').length * 100) / $('input:checkbox').length;

    $("#pourcentage").attr("style", "width: " + pourcentage + "%;");
    $("#pourcentage").text(pourcentage.substr(0, 4) + "%");
}



// fonction qui permet de formater l'affihage du temps d'apparition et de disparition des sentences
function format_time(element, start, end, type) {
    var minutes_start = "00" + Math.floor(start / 60);
    var seconds_start = "" + (start - minutes_start * 60);
    if (seconds_start.length <= 3 && seconds_start.indexOf('.') > -1) seconds_start += "0"
    if (seconds_start.indexOf('.') == -1) seconds_start += ".00"
    var minutes_end = "00" + Math.floor(end / 60);
    var seconds_end = "" + (end - minutes_end * 60);
    if (seconds_end.length <= 3 && seconds_end.indexOf('.') > -1) seconds_end += "0"
    if (seconds_end.indexOf('.') == -1) seconds_end += ".00"


    if (type == 'return'){
        return minutes_start.substr(-3) + ":" + seconds_start.substr(0, 4) + " - " 
                            + minutes_end.substr(-3) + ":" + seconds_end.substr(0, 4)
    }

    // mise à jours Jquery
    if (type == 'jq') {
        var obj = element.children().first().text(minutes_start.substr(-3) + ":" + seconds_start.substr(0, 4) + " - " 
                    + minutes_end.substr(-3) + ":" + seconds_end.substr(0, 4));
    } else {
        // mise à jours DOM
        element.chilinnerHTML = minutes_start.substr(-3) + ":" + seconds_start.substr(0, 4) + " - " 
                            + minutes_end.substr(-3) + ":" + seconds_end.substr(0, 4)
    }
}



// fonction qui permet de rajouter une sentence graphiquement 
function createDiv(sentence_id, start, end, type){
    if (sentence_id != '-1'){
        var div_already_created = document.getElementById("sentence_" + start);

        // si la div de cette sentence a deja ete cree, il suffit de mettre a jours l'id de la sentence
        if (div_already_created != undefined && div_already_created.getAttribute("sentence_id") == '-1'){
            div_already_created.setAttribute("sentence_id", sentence_id);
            document.getElementById("locuteur_select_-1").setAttribute("id", "locuteur_select_" + sentence_id);
            document.getElementById("play_sentence_" + start).setAttribute("onclick", "inaudibleSentence(" + sentence_id + ");" + ");");
            return;
        }
    }

    var span;
    if (type != 'split'){
        span = collection.addTimeSpan(start, end);
    } else {
        span = collection.getTimeSpanAtPosition(start);
    }
    span.onPositionChanged(function(time_start, time_end){
        MAJtimespan(time_start, time_end);
    });
    span.onClick(function(time_start, time_end){
        sendMajTimeSpan(time_start, time_end);
    });
    
    var MAJtemps = format_time(null, start, end, 'return');

    if (type == 'enable'){
        textare_right = "<textarea class='textarea_basic'";
        input_checkable = "<input type='checkbox' class='valid_transcription' id='valid_sentence_"+start+"' onclick='validSentence(this," + start + ");'>";
    } else {
        textare_right = "<textarea class='textarea_basic textarea_not_editable' readonly='true' ";
        input_checkable = "<input type='checkbox' class='valid_transcription' id='valid_sentence_"+start+"' onclick='return false;'>";
    }


    var div = "<span class='input-group-addon' id='sizing-addon3' style='position: relative;'>"
                    +"<div style='top: 6px;'>"+MAJtemps+"</div></br>"
                    +"<select id='locuteur_select_"+sentence_id+"' class='select_locuteur'>"
                    +"</select>"
                +"</span>"
            +"<div class='merge_transcription'>"
                +"<span id='merge_sentence_"+start+"' "
                +"class='glyphicon glyphicon-resize-vertical'"
                +"style='cursor: pointer;' tabindex='0' onclick='return false;'></span>"
            +"</div>"
            +"<div class='play_transcription' style='visibility: hidden;'>"
                +"<a id='play_sentence_"+start+"'>"
                    +"<span class='glyphicon glyphicon-warning-sign' style='cursor: pointer;'></span>"
                +"</a>"
            +"</div>"
            +input_checkable
            +textare_right
                +"timeStart='"+start+"'"
                +"timeEnd='"+end+"'"
                +"ondblclick='focusSentence(this);'></textarea>";

    var divNode = document.createElement('div');
    divNode.setAttribute("id", "sentence_" + start);
    divNode.setAttribute("class", "input-group");
    divNode.setAttribute("timeStart", start);
    divNode.setAttribute("timeEnd", end);
    divNode.setAttribute("sentence_id", sentence_id);
    divNode.innerHTML = div;


    if(span.getNext() == null){
        $("#div_sentences").append(divNode);
    } else {
        var afterInsert = $("div[id='sentence_"+span.getNext().getStart()+"']");
        afterInsert.before(divNode);
    }

    if (type == 'enable'){
        $("#merge_sentence_"+start).attr("onclick", "mergeSpan(" + start + "," + end + ");");
    }
    $("#play_sentence_"+start).attr("onclick", "inaudibleSentence(" + sentence_id  + ");");
}




// ====== toobar du video player ====== //

function fastBackward(){
    video_player.currentTime = video_player.currentTime - 5;
}

function backward(){
    video_player.currentTime = video_player.currentTime - 2;
}

function videoPause(){
    if (video_player.paused == false){
        video_player.pause();
    }
}

function videoPlay(){
    if (video_player.paused == true){
        video_player.play();
    }
}

function repeat(){
    var currentTextarea = $("textarea").filterCurrentTime("time", video_player.currentTime);  

    if (currentTextarea.val() != undefined){
        playSpan(currentTextarea.attr('timeStart'), currentTextarea.attr('timeEnd'));
    } else {
        $("#information").empty();
        $("#information").append("<div class='alert alert-warning alert-dismissible' role='alert'><button type='button' class='close' data-dismiss='alert' aria-label='Close'><span aria-hidden='true'>&times;</span></button><strong>Warning!</strong> Placer sur la phrase courante pour la jouer en boucle.</div>");
    }
}


function forward(){
    video_player.currentTime = video_player.currentTime + 2;
}


function fastForward(){
     video_player.currentTime = video_player.currentTime + 5;
}
