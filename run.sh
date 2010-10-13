#!/bin/bash
export FILE=$1
export FILE=${FILE:=fryn.html}
(sleep 2 ; open "http://localhost:8000/$FILE") &
python -m SimpleHTTPServer
