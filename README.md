# metric-boy

Simple metrics collecting and reporting for your game.

## API

<h3>Make a new session</h3>
  <pre>POST /new_session/:gameId/:authToken</pre>

  <h3>Tag session data</h3>
  <pre>POST /tag/:gameId/:authToken/:sessionId
{
  "tag": "kill",
  "playerKilled": "mage",
  "killedBy": "thief"
}</pre>

  <h3>End session</h3>
  <pre>POST /end_session/:gameId/:authToken/:session_id</pre>
