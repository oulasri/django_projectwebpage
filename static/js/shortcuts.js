document.onkeydown = KeyPress;

// Shift + Tab
$(document).bind('keydown', 'Shift+tab', function(e) { previous_focus(); e.preventDefault(); });

// Tab
$(document).bind('keydown', 'tab', function(e) { next_focus(); e.preventDefault();});

$("textarea").keydown(function(e) {
    if(e.keyCode === 9) { // tab
        if (e.shiftKey){
            previous_focus();
        } else {
            next_focus();
        }
        e.preventDefault();
    }
});

function next_focus(){
    var textarea_selected = $("textarea").filterCurrentTime("time", video_player.currentTime);

    if (textarea_selected != undefined){
        focusSentence($("#div_sentences").children().get(textarea_selected.parent().index() + 1));
    } else {
        focusSentence($("#div_sentences").children(':first'));
    }
}


function previous_focus(){
    var textarea_selected = $("textarea").filterCurrentTime("time", video_player.currentTime);

    if (textarea_selected != undefined){
        focusSentence($("#div_sentences").children().get(textarea_selected.parent().index() - 1));
    } else {
        focusSentence($("#div_sentences").children().get($("#div_sentences").children().length - 1));
    }
}

// on récupère les évènements clavier pour le split de sentence
function KeyPress(e) {
    var evtobj = window.event? event : e
    // CTRL + Return
    if (evtobj.ctrlKey && evtobj.keyCode == 13){
        var textarea = $("textarea").filterCurrentTime("time", video_player.currentTime);

        if (textarea.val() == undefined 
            || textarea.attr("timeStart") >= video_player.currentTime 
            || textarea.attr("timeEnd") <= video_player.currentTime){
            $("#information").empty();
            $("#information").append("<div class='alert alert-warning alert-dismissible' role='alert'><button type='button' class='close' data-dismiss='alert' aria-label='Close'><span aria-hidden='true'>&times;</span></button><strong>Warning!</strong> Pour couper une phrase en deux, il faut placer le curseur sur le flux audio et dans la zone d'edition de sous-titres au bon endroit.</div>");
        } else {
            splited = split(textarea, 
                textarea.prop("selectionStart"), 
                textarea.attr("timeStart"), 
                textarea.attr("timeEnd"), 
                video_player.currentTime);

            focusSentence(splited);
        }
    }

    // CTRL + Space
    if (evtobj.ctrlKey && evtobj.keyCode == 32){
        if (video_player.paused == true){
            video_player.play();
        } else {
            video_player.pause();
        }
    }

    // CTRL + d
    if (evtobj.ctrlKey && evtobj.keyCode == 68){
        var textarea = $("textarea").filterCurrentTime("time", video_player.currentTime);

        if (textarea.val() == undefined){
            $("#information").empty();
            $("#information").append("<div class='alert alert-warning alert-dismissible' role='alert'><button type='button' class='close' data-dismiss='alert' aria-label='Close'><span aria-hidden='true'>&times;</span></button><strong>Warning!</strong> Il faut se positionner sur la phrase pour la supprimer.</div>");
        } else {
            deleteSpan(textarea);
        }
        e.preventDefault();
    }


    // CTRL + i
    if (evtobj.ctrlKey && evtobj.keyCode == 73){
        var textarea = $("textarea").filterCurrentTime("time", video_player.currentTime);

        if (textarea.val() == undefined){
            insertSpan(video_player.currentTime, e);
        } else {
            $("#information").empty();
            $("#information").append("<div class='alert alert-warning alert-dismissible' role='alert'><button type='button' class='close' data-dismiss='alert' aria-label='Close'><span aria-hidden='true'>&times;</span></button><strong>Warning!</strong> Il faut se positionner sur une zone vide pour ajouter une phrase.</div>");
        }
        e.preventDefault();
    }
}















