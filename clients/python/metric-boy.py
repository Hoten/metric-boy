from __future__ import unicode_literals
import requests, json
from pprint import pprint
import sys
import logging

class MetricBoyClient:
  def __init__(self, url, gameId, authToken):
    self.url = "%s/api/%s" % (url, 'v1');
    self.gameId = gameId;
    self.authToken = authToken;

  def get_start_session_url(self):
    return "%s/new_session/%s/%s" % (self.url, self.gameId, self.authToken)

  def get_end_session_url(self):
    return "%s/end_session/%s/%s/%s" % (self.url, self.gameId, self.authToken, self.sessionId)

  def get_tag_url(self):
    return "%s/tag/%s/%s/%s" % (self.url, self.gameId, self.authToken, self.sessionId)

  def start_session(self, info={}):
    r = requests.post(self.get_start_session_url(), json=info)
    self.sessionId = r.json()["sessionId"];

  def end_session(self, info={}):
    r = requests.post(self.get_end_session_url(), json=info)

  def tag(self, tagType, data={}):
    data["tag"] = tagType
    r = requests.post(self.get_tag_url(), json=data)


if __name__ == "__main__":
  import socket, uuid, random, time

  ip = socket.gethostbyname(socket.gethostname())
  mac = uuid.getnode()

  times = int(sys.argv[3])
  for i in range(times):
    client = MetricBoyClient("http://localhost:3000", sys.argv[1], sys.argv[2])
    client.start_session({"username": "hoten", "ip": ip, "mac": mac})

    winner = random.choice(["mage", "rogue", "thief"])
    client.tag("game", {"players": ["mage", "rogue", "thief"], "winner": winner})

    time.sleep(random.uniform(1.0, 3.0))

    client.end_session()
