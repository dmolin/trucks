# TRUCKS

This is code I had to write for a technical interview. I was asked to model a scenario in which one or more trucks had to deliver parcels to 3 different buildings; the parcels had to be collected from a depot before delivery.

The code uses Prototypal inheritance; Object instances extends other objects instances through the prototype chain.

The result is the code that follow.

The code can also be inspected as a fiddle here: http://jsfiddle.net/np27n/8/ (it's not kept in synch with the project though)

## NOTE on the usage of "Tash"

In this example I used "Tash", a library I developed to implement reactive systems. It's in my githup repos, here: https://github.com/dmolin/tash

Tash is just another Pub/Sub implementation I derived from the work of Peter Higgins (@Dojo); I strongly believe reactive systems are the true key for implementing decoupled components; the proof is given by the logger used in this example: the logger is just an object that reacts to events published by trucks; It could even be easily decoupled from the truck, if wanted, and can be added/removed from the code without affecting any other area of the code.