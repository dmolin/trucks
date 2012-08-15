# TRUCK

This is code I had to write for a technical interview. I was asked to model a scenario in which one or more trucks had to deliver parcels to 3 different buildings; the parcels had to be collected from a depot before delivery.

I approached the code using Prototypal inheritance, avoiding the classical inheritance approach and only extending objects through objects.

The result is the code that follow.

## NOTE on the usage of "Tash"

In this example I used "Tash", a library I developed to implement reactive systems.
Tash is just another Pub/Sub implementation I derived from the work of Peter Higgins (@Dojo); I strongly believe reactive systems are the true key for implementing decoupled components; the proof is given by the logger used in this example: the logger is just an object that reacts to events published by trucks; It could even be easily decoupled from the truck, if wanted, and can be added/removed from the code without affecting any other area of the code.