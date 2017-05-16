from channels.routing import route
from backend.consumers import ws_connect, ws_message, ws_disconnect
from channels.staticfiles import StaticFilesConsumer

channel_routing = [
    # used only with static files (css, js, ...) for admin 
    route('http.request', StaticFilesConsumer()),

    # websocket channels to our consumers 
    route("websocket.connect", ws_connect),
    route("websocket.receive", ws_message),
    route("websocket.disconnect", ws_disconnect),
]
