from django import forms



CHOICES = (('video', 'Video',), ('audio', 'Audio',))

class ConnexionForm(forms.Form):
    username = forms.CharField(label="Username", max_length=30)
    password = forms.CharField(label="Password", widget=forms.PasswordInput)


class UserForm(forms.Form):
    username = forms.CharField(label="Username", max_length=30)
    first_name = forms.CharField(label="First name", max_length=30)
    last_name = forms.CharField(label="Last name", max_length=30)
    email = forms.CharField(label="Email", max_length=30)
    password1 = forms.CharField(label="Password", widget=forms.PasswordInput)
    password2 = forms.CharField(label="Password", widget=forms.PasswordInput)


class DocumentForm(forms.Form):
    titre = forms.CharField(label="Nom du fichier (avec extension)", max_length=200)
    type_fichier = forms.ChoiceField(widget=forms.RadioSelect, choices=CHOICES, initial='video')


class UploadFileTest(forms.Form):
    fichier = forms.FileField()
    fichier_xml = forms.FileField()
    type_fichier = forms.ChoiceField(widget=forms.RadioSelect, choices=CHOICES, initial='video')
    fichier_wav_video = forms.FileField(required=False)


class EditDocumentForm(forms.Form):
    titre = forms.CharField(label="Nom du document (sans extension)", max_length=200)
    client = forms.CharField(label="Nom du client", max_length=50)
        
