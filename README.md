# TRUCKS

This is code I had to write for a technical interview. I was asked to model a scenario in which one or more trucks had to deliver parcels to 3 different buildings; the parcels had to be collected from a depot before delivery.

![Hers' trucks in action](https://raw.github.com/dmolin/trucks/master/README/trucks.png)

The code uses Prototypal inheritance; Object instances extends other objects instances through the prototype chain.

The result is the code that follow.
Don't expect to see a formally structured code here: no jake/grunt file, no minification or build stage in place; not even multiple files. It's just a fiddle/hack for a tech interview and, as such, a single html+js file will suffice :)

The code can also be inspected as a fiddle [here](http://jsfiddle.net/dmolin/np27n/12/show/). (See [here](http://jsfiddle.net/np27n/12/) for playing with the code. - Note:it's not kept in synch with the project though)

## Technologies Used ##

- jQuery
- Tash! (my other github project. see [here](https://github.com/dmolin/tash))

## Reactive Components and Event bus ##

This example leverages the concept of reactive components. A system made of reactive components takes advantage of loose coupling and it's thus resilient to change and easy to extend and test in isolation.

The 2 logger panels on the far right of the screen are an example. They subscribe to log events published from the trucks and thus provide a status update on what each truck is doing:

```javascript
(simplified version shown)

test.delivery.TruckLogger = {
    create: function (truck, containerEl) {
        var loggerEl;

        ...

        tash.events.require('test.events.truck_' + truck.getName());

        test.events['truck_' + truck.getName()].subscribe(function (truck, message) {
        	//log event coming from the truck
        });
    }
};

```

Each truck leverages events to build a FSA (Finite State Automaton) to manage the various states it has to go through in its journey (collecting parcels, delivering tracks, getting back to base):

```javascript
(simplified version shown)

function initFiniteStateAutomaton() {
    //register listeners for events
    getQueue('parcelsNotAcquired').subscribe(function () {
        //transition to deliveryCompleted.
        getQueue('deliveryCompleted').publish();
    });

    getQueue('parcelsAcquired').subscribe(function (parcels) {
        //start delivering the parcels, starting from the first one
        deliverParcel(parcels, 0);
    });

    getQueue('parcelsDelivered').subscribe(function () {
        getQueue('deliveryCompleted').publish();
    });

    getQueue('deliveryCompleted').subscribe(function () {
        //get back to base
        driver.driveTo(originalLocation, function () {
            logProgress("delivery completed");
        });
    });
}

```

## NOTE on the usage of "Tash"

In this example I used "Tash", a library I developed to implement reactive systems. It's in my githup repos, [here](https://github.com/dmolin/tash)

Tash is just another Pub/Sub implementation I derived from the work of Peter Higgins (@Dojo); I strongly believe reactive systems are the true key for implementing decoupled components; the proof is given by the logger used in this example: the logger is just an object that reacts to events published by trucks; It could even be easily decoupled from the truck, if wanted, and can be added/removed from the code without affecting any other area of the code.

