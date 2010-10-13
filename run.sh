#!/bin/bash
(sleep 3 ; open "http://localhost:8000/fryn.html") &
python -m SimpleHTTPServer
