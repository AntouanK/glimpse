
# glimpse

_npm package for taking snapshots of your website_

why
--
There is already a module to handle the html snapshot generating task.

[html-snapshots](https://www.npmjs.org/package/html-snapshots)

But this module assumes that you have a server in order to serve your website files.
When you are in a build process though, your 'deploy' files are just being created, so usually there is no server for them yet ( well, you can set it up, but why add more manual work? )

glimpse does set this server up for you. So there is a static server pointing to whatever folder you want ( probably the folder with the 'deploy' files ) and it able to take the snapshots using that server.

Also, there is no 'wait' time to set up ( at least for now ). PhantomJS will output the html code as soon as the page it's ready ( after all the JS is complete ).
And you can also inject your JS code before that happens, so you can strip out for example `<script>` tags, or do whatever you want ( you have direct access to that `window` object through phantom ).
