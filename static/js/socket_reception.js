if (documentView) {
    socket.onmessage = function(e) {
    	//alert(e.data);
    	let json_recepted = JSON.parse(e.data);
    	var user_event = document.getElementById("user_event");

        // reception du changement de locuteur d'une sentence
        if (json_recepted['type'] == 'locuteur') {
            if (json_recepted['user_id'] == userId) return;

            $('#locuteur_select_' + json_recepted['sentence_id'] + ' option[value=' + json_recepted['locuteur_id'] +']').prop('selected', true);
            user_event.innerHTML = "-> User " + json_recepted['user_id'] + " a mis à jours le locuteur de la sentence n°" + json_recepted['sentence_id'] + "</br>" + user_event.innerHTML;
            return;
        }

    	// reception de la validation d'une sentence
    	if (json_recepted['type'] == 'valid') {
            var div = $( "div[sentence_id='" + json_recepted['sentence_id'] + "']");
    		var span = div.children().first();
    		var merge = span.next();
    		var play = merge.next();
    		var valid = play.next();
    		var textarea = valid.next();

	        
    		div.attr("id", "sentence_" + json_recepted['time_start']);
    		div.attr("timeStart", json_recepted['time_start']);
    		div.attr("timeEnd", json_recepted['time_end']);
    		format_time(span, json_recepted['time_start'], json_recepted['time_end'], 'jq');
    		merge.children().first().attr("id", "merge_sentence_" + json_recepted['time_start']);
    		play.children().first().attr("id", "play_sentence_" + json_recepted['time_start']);
    		valid.attr("id", "valid_sentence_" + json_recepted['time_start']);
    		textarea.attr("timeStart", json_recepted['time_start']);
    		textarea.attr("timeEnd", json_recepted['time_end']);
    		textarea.val(json_recepted['value']);

    		// on met à jours l'appel aux fonctions qui permettront de merger et de lire la phrase courante
			merge.children().first().attr("onclick", "mergeSpan(" + json_recepted['time_start'] + "," + json_recepted['time_end'] + ");");
			play.children().first().attr("onclick", "inaudibleSentence(" + json_recepted['sentence_id'] + ");");
			valid.attr("onclick", "validSentence(this," + json_recepted['time_start'] + ");");
			valid.prop('checked', true);
			MAJpourcentage();
			user_event.innerHTML = "-> User " + json_recepted['user_id'] + " a validé la phrase n°" + json_recepted['sentence_id'] + "</br>" + user_event.innerHTML;
			return;
		}


    	// reception de l'invalidation d'une sentence
    	if (json_recepted['type'] == 'invalid') {
    		var div = $( "div[sentence_id='" + json_recepted['sentence_id'] + "']");
    		var valid = div.children().eq(3);

    		valid.prop('checked', false);
    		MAJpourcentage();
    		user_event.innerHTML = "-> User " + json_recepted['user_id'] + " a invalidé la phrase n°" + json_recepted['sentence_id'] + "</br>" + user_event.innerHTML;
    		return;
    	}


    	// reception de la suppression d'une sentence
    	if (json_recepted['type'] == 'delete') {
    		var div = $( "div[sentence_id='" + json_recepted['sentence_id'] + "']");
    		var span = collection.getTimeSpanAtPosition(div.attr('timeStart'));
    		if (span != undefined){
    			collection.removeTimeSpan(span);
    		}
    		//div.next().remove();
    		div.remove();
    		MAJpourcentage();
    		user_event.innerHTML = "-> User " + json_recepted['user_id'] + " a supprimé la phrase n°" + json_recepted['sentence_id'] + "</br>" + user_event.innerHTML;
    		return;
    	}


    	// reception de l'insertion d'une sentence
    	if (json_recepted['type'] == 'insert') {
    		createDiv(json_recepted['sentence_id'], json_recepted['time_start'], json_recepted['time_end'], '');

            // mise à jours de la balise Select
            var first = $("#div_sentences").children(':first');
            if (first.children(':first').children(':last').children().length == 0){
                $("#locuteur_select_"+json_recepted['sentence_id']).append(first.next().children(':first').children(':last').children().clone());
            } else {
                $("#locuteur_select_"+json_recepted['sentence_id']).append(first.children(':first').children(':last').children().clone());
            }
            $("#locuteur_select_"+json_recepted['sentence_id']).change(function() {
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

    		MAJpourcentage();
    		user_event.innerHTML = "-> User " + json_recepted['user_id'] + " a inséré la phrase n°" + json_recepted['sentence_id'] + "</br>" + user_event.innerHTML;
    		return;
    	}


    	// reception du split d'une sentence
    	if (json_recepted['type'] == 'split') {
    		user_event.innerHTML = "-> User " + json_recepted['user_id'] + " a splité la phrase n°" + json_recepted['sentence_id1'] + "</br>" + user_event.innerHTML;

    		// lorsque le client qui envoi la requête la recoit, il a déjà crée la sentence, il ne lui reste juste qu'à
    		// mettre à jours les attributs d'ID
    		var second_sentence = document.getElementById("sentence_" + json_recepted['time_start2']);
    		if (second_sentence != undefined){
    			second_sentence.setAttribute("sentence_id", json_recepted['sentence_id2'])
                document.getElementById("locuteur_select_-1").setAttribute("id", "locuteur_select_" + json_recepted['sentence_id2']);
    			return;
    		}
    		collection.split(json_recepted['time_start2']);
    		var new_span1 = collection.getTimeSpanAtPosition(json_recepted['time_start1']);
		    new_span1.onPositionChanged(function(start, end){
		        MAJtimespan(start, end);
		    });
		    new_span1.onClick(function(start, end){
		        sendMajTimeSpan(start, end);
		    });
		    var new_span2 = collection.getTimeSpanAtPosition(json_recepted['time_start2']);
		    new_span2.onPositionChanged(function(start, end){
		        MAJtimespan(start, end);
		    });
		    new_span2.onClick(function(start, end){
		        sendMajTimeSpan(start, end);
		    });

    		// === MISE A JOURS DU SPLIT N°2 === //
    		createDiv(json_recepted['sentence_id2'], json_recepted['time_start2'], json_recepted['time_end2'], 'split');
    		$("textarea[timeStart='" + json_recepted['time_start2'] + "']").val(json_recepted['value2']);

    		merge_span = document.getElementById("merge_sentence_" + json_recepted['time_start2']);
    		play_span = document.getElementById("play_sentence_" + json_recepted['time_start2']);
    		valid_span = document.getElementById("valid_sentence_" + json_recepted['time_start2']);

    		// on met à jours l'appel aux fonctions qui permettront de merger et de lire la phrase courante
		    merge_span.setAttribute("onclick", "mergeSpan(" + json_recepted['time_start2'] + "," + json_recepted['time_end2'] + ");");
		    play_span.setAttribute("onclick", "inaudibleSentence(" + json_recepted['sentence_id2'] + ");" );
		    valid_span.setAttribute("onclick", "validSentence(this," + json_recepted['time_start2'] + ");");



		    // === MISE A JOURS DU SPLIT N°1 === //
		    var split1 = $("div[id='sentence_"+json_recepted['time_start1']+"']");
		    split1.attr("timeStart", json_recepted['time_start1']);
		    split1.attr("timeEnd", json_recepted['time_end1']);

		    merge_span = document.getElementById("merge_sentence_" + json_recepted['time_start1']);
		    play_span = document.getElementById("play_sentence_" + json_recepted['time_start1']);
		    valid_span = document.getElementById("valid_sentence_" + json_recepted['time_start1']);

		    // on met à jours l'appel aux fonctions qui permettront de merger et de lire la phrase courante
		    merge_span.setAttribute("onclick", "mergeSpan(" + json_recepted['time_start1'] + "," + json_recepted['time_end1'] + ");");
		    play_span.setAttribute("onclick", "inaudibleSentence(" + json_recepted['sentence_id1'] + ");" );
		    valid_span.setAttribute("onclick", "validSentence(this," + json_recepted['time_start1'] + ");");
		    merge_span.setAttribute("id", "merge_sentence_" + json_recepted['time_start1']);
		    play_span.setAttribute("id", "play_sentence_" + json_recepted['time_start1']);
		    valid_span.setAttribute("id", "valid_sentence_" + json_recepted['time_start1']);

		    // mise à jours du texte de la sentence et du temps
	    	split1.children().last().val(json_recepted['value1']);
		    split1.children().last().attr("timeStart", json_recepted['time_start1']);
		    split1.children().last().attr("timeEnd", json_recepted['time_end1']);
		    format_time(split1.children().first(), json_recepted['time_start1'], json_recepted['time_end1'], 'jq');


            // mise à jours de la balise Select du second split
            var split2 = $("div[sentence_id='"+json_recepted['sentence_id2']+"']");
            $("#locuteur_select_" + json_recepted['sentence_id2']).append(split1.children(':first').children(':last').children().clone());

            $("#locuteur_select_" + json_recepted['sentence_id2']).change(function() {
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
    		MAJpourcentage();
    		return;
    	}


    	// reception du merge d'une sentence
    	if (json_recepted['type'] == 'merge') {
    		user_event.innerHTML = "-> User " + json_recepted['user_id'] + " a mergé les phrases n°" 
    					+ json_recepted['sentence_id'] + " et n°" + json_recepted['to_delete'] + "</br>" + user_event.innerHTML;
    		
    		// lorsque le client qui envoi la requête la recoit, il a déjà effectué les mises à jours
    		var to_delete = $("div[sentence_id='" + json_recepted['to_delete'] + "']");
    		if ($("div[sentence_id='" + json_recepted['to_delete'] + "']").length == 0) {
    			return;
    		}

    		// Mise à jours de la phrase à merger
    		span_merge2 = collection.getTimeSpanAtPosition(json_recepted['time_end']);
    		collection.mergeWithPrev(span_merge2);

    		collection.getTimeSpanAtPosition(json_recepted['time_start']).onPositionChanged(function(start, end){
		        MAJtimespan(start, end);
		    });
		    collection.getTimeSpanAtPosition(json_recepted['time_start']).onClick(function(start, end){
		        sendMajTimeSpan(start, end);
		    });

		    // MAJ graphique
		    div = $("div[id='sentence_"+json_recepted['time_start']+"']");
		    div.attr("timeEnd", json_recepted['time_end'])

	        time = div.children().first();
	        merge_span = time.next();
	        play_span = merge_span.next();
	        input = play_span.next();
	        textarea = input.next();
		    

		    format_time(time, json_recepted['time_start'], json_recepted['time_end'], 'jq');
		    textarea.val(json_recepted['value']);
		    textarea.attr("timeStart", json_recepted['time_start']);
		    textarea.attr("timeEnd", json_recepted['time_end']);
		    merge_span.children().first().attr("id", "merge_sentence_" + time_start);
    		play_span.children().first().attr("id", "play_sentence_" + time_start);
    		input.attr("id", "valid_sentence_" + time_start);
		    merge_span.children().first().attr("onclick", "mergeSpan(" + time_start + "," + time_end + ");");
		    play_span.children().first().attr("onclick", "inaudibleSentence(" + json_recepted['sentence_id'] + ");" );
		    input.attr("onclick", "validSentence(this," + time_start + ");");

		    //to_delete.next().remove();
    		to_delete.remove();
    		MAJpourcentage();
    		return;
    	}


    	// reception de la mise à jours du temps d'une sentence
    	if (json_recepted['type'] == 'maj_time') {
    		var div = $("div[sentence_id='" + json_recepted['sentence_id'] + "']");
    		var time_span = collection.getTimeSpanAtPosition(div.attr("timeStart"));
    		time = div.children().first();
	        merge_span = time.next();
	        play_span = merge_span.next();
	        input = play_span.next();
	        textarea = input.next();

	        // mise à jours des balises html
	        div.attr("id", "sentence_" + json_recepted['time_start']);
	        div.attr("timeStart", json_recepted['time_start']);
	        div.attr("timeEnd", json_recepted['time_end']);

	        format_time(time, json_recepted['time_start'], json_recepted['time_end'], 'jq');
		    textarea.attr("timeStart", time_start);
		    textarea.attr("timeEnd", time_end);

		    merge_span.children().first().attr("id", "merge_sentence_" + time_start);
    		play_span.children().first().attr("id", "play_sentence_" + time_start);
    		input.attr("id", "valid_sentence_" + time_start);
		    merge_span.children().first().attr("onclick", "mergeSpan(" + time_start + "," + time_end + ");");
		    play_span.children().first().attr("onclick","inaudibleSentence(" + json_recepted['sentence_id'] + ");" );
		    input.attr("onclick", "validSentence(this," + time_start + ");");

		    // mise à jours de l'outwave
		    time_span.setStart(json_recepted['time_start']);
		    time_span.setEnd(json_recepted['time_end']);
		    user_event.innerHTML = "-> User " + json_recepted['user_id'] + " a mis à jours le temps de la phrase n°" 
    					+ json_recepted['sentence_id'] + "</br>" + user_event.innerHTML;
    		return;
    	}

    	// reception de la mise à jours du temps d'une sentence
    	if (json_recepted['type'] == 'edit_text') {
            var div = $("div[sentence_id='" + json_recepted['sentence_id'] + "']");
    		var textarea = div.children().last();
    		textarea.val(json_recepted['value']);
    		user_event.innerHTML = "User " + json_recepted['user_id'] + " a édité le texte de la phrase n°" 
    					+ json_recepted['sentence_id'] + "</br>" + user_event.innerHTML;
    		return;
    	}


    	// reception de la connexion ou deconnexion d'un utilisateur sur le même document
    	// cette condition permet de partager le document entre tous les utilisateurs 
    	if (json_recepted['type'] == 'connect' || json_recepted['type'] == 'disconnect') {
    		users = [];
    		sentences = $("#div_sentences").children();
    		$("textarea").attr('readonly', true);
    		$("textarea").addClass('textarea_not_editable');
    		$(".glyphicon-resize-vertical").attr("onclick", "return false;");
		    $(".valid_transcription").attr("onclick", "return false;");

    		// suppression des doublons (un utilisateur peu avoir plusieurs fenetre ouverte)
    		$.each(json_recepted['repartition'], function(i, element){
			    if($.inArray(element, users) === -1) users.push(element);
			});

    		// repartition des sentences à chaques utilisateurs
    		nb_sentences_affectee = Math.floor(sentences.length / users.length);
    		reste = sentences.length % users.length;
    		index = users.indexOf(userId.toString());

    		for (var i = 0; i < nb_sentences_affectee; i++) {
    			current = nb_sentences_affectee * index + i;
    			temp = $("#div_sentences").children().eq(current);
    			enable(temp);
    		}

    		// assignation du reste des phrases au dernier utilisateur
    		if (users.length - 1 == index) {
    			for (var i = 1; i <= reste; i++) {
    				temp = $("#div_sentences").children().eq($("#div_sentences").children().length - i);
    				enable(temp);
    			}
    		}

    		MAJpourcentage();
    		return;
    	}
    } 
}



function enable(element){
	time = element.children().first();
	merge = time.next();
	play = merge.next();
	valid = play.next();
	textarea = valid.next();

	textarea.attr('readonly', false); 
	textarea.removeClass('textarea_not_editable');

	merge.children().first().attr("onclick", "mergeSpan(" + textarea.attr("timeStart") + "," + textarea.attr("timeEnd") + ");");
    valid.attr("onclick", "validSentence(this," + textarea.attr("timeStart") + ");");
}










