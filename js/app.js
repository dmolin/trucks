/*jshint white: false, browser: true, devel: true, onevar: false, undef: true,
 nomen: false, eqeqeq: true, plusplus: false, bitwise: true, regexp: true, jquery: true,
 newcap: true, immed: true, sub: true, loopfunc: true, latedef: false, unused:false*/
/*global tash:true, test:true */

tash.namespace('test.delivery');
tash.events.require('test.events.AppInited');

/*===============================================================
 * The following namespace+functions should ideally be part of a common
 * library
 *===============================================================*/

(function () {

    test.util = {
        rand: function (min, max) {
            return Math.floor(Math.random() * max) + min;
        },

        Screen: {
            /**
            * Microtemplating facility
            */
            template: function (tmpl, obj) {
                var i,
                    matches = tmpl.match(/\{\{(\w+)\}\}/g);
                for (i = 0; i < matches.length; i++) {
                    var matched = matches[i];
                    if (matched.charAt(0) !== '{') {
                        return;//in IE the global flag still return the whole string as first match
                    }
                    tmpl = tmpl.replace(matched, obj[matched.substr(2, matched.length - 4)] || matched);
                }
                return tmpl;
            }

        }
    };

    test.OO = {
        /**
        * Crockford's method for extending instances with inheritance
        * expanded to support initialization from prototype argument. Mimics the same behavior as Object.create
        * but retains compatibility with pre-ECMAScript. 5 browsers
        * @param o  Object instance to use as prototype
        * @param proto Additional protype to add (override functions and other additional properties)
        * @param other params = they're passed along to the constructor function, if present
        */
        extend: function (o, proto) {
            var obj,
                supercls,
                i;

            // define a new function
            function F() {}
            // set the prototype to be the object we want to inherit from
            F.prototype = o;
            obj = new F();
            //add proto to the prototype, if available
            if (proto) {
                for (i in proto) {
                    if (proto.hasOwnProperty(i)) {
                        if (typeof obj[i] === 'function') {
                            //override. link to the parent implementation
                            supercls = obj[i];
                            obj[i] = proto[i];
                            obj[i].supercls = supercls;
                        } else {
                            obj[i] = proto[i];
                        }
                    }
                }
            }

            if (typeof obj._constructor !== 'undefined') {
                obj._constructor.apply(obj, Array.prototype.slice.call(arguments, 2));
            }
            return obj;
        },

        mapFromSelector: function( selector, builder ) {
            var collection = [];
            $(selector).each( function(idx, node) {
                collection.push( builder(node) );
            });
            return collection;
        }
    };

}());


/*===============================================================
 * Main Application logic
 *===============================================================*/

test.delivery.App = (function ($) {

    var depot,
        trucks = [],
        loggers = []; //loggers for the trucks

    /**
    * identifies all the trucks and, for each one of them,
    * build their object representation and start it
    */
    function _run() {
        //create depot and trucks
        depot = test.delivery.Depot.create($('.depot'));
        $('.delivery-truck').each(function () {
            trucks.push(test.delivery.Truck.create($(this), depot));
        });

        //signal that this app is ready. this will give a chance tu external module
        //to plug-in other functionalities (such as adding new behavior)
        //the subscribers will receive the handle of this App as the callback parameter
        test.events.AppInited.publish(this);

        tash.each(trucks, function (truck /*, index*/) {
            //create a logger for this truck
            loggers.push(test.delivery.TruckLogger.create(truck));

            //the purpose of this setTimeout is just to
            //start the tracks at different moments in time. nothing more than this
            setTimeout(function () {
                truck.deliver();
            }, test.util.rand(1000, 4000));
        });
    }

    return {
        run: _run,
        getTrucks: function () { return trucks; }
    };
}(jQuery));


/**
* Model a geometrical entity with a 2D position in space
*/
test.delivery.BaseEntity = {
    create: function (source) {
        var id,
            position;

        function _getName() {
            return id;
        }

        function _getPosition() {
            return position;
        }

        function _toString() {
            return "name(" + id + ")";
        }

        /* position of buildings is supposed to be fixed, so no reason
        * to recompute it at every call. thus, it will be fetched only
        * at initialization time
        */
        function initPosition() {
            var pos = source.position();
            position = {
                x: pos.left,
                y: pos.top,
                width: source.width(),
                height: source.height()
            };
        }

        id = (source.attr('id') || source.attr('class'));
        if (!source) {
            throw test.delivery.errors.create(test.delivery.errors.ENOARGS);
        }

        initPosition();

        return {
            getName: _getName,
            getPosition: _getPosition,
            toString: _toString,
            el: $(source)
        };
    }
};


/**
 * Model a generic building
 */
test.delivery.Building = {
    create: function (source) {
        var self = test.OO.extend(test.delivery.BaseEntity.create(source), {});
        return self;
    }
};


/**
 * Model a Depot (contains parcels to be delivered)
 */
test.delivery.Depot = {
    create: function (source) {
        var self = test.OO.extend(test.delivery.Building.create(source), {
            getParcels: function () {
                //return parcels according to existing delivery addresses
                return test.OO.mapFromSelector('.delivery-address', function (item) {
                    return test.delivery.Building.create($(item));
                });
            }
        });
        return self;
    }
};


/**
 * Model a truck entity. A truck is a moveable BaseEntity.
 * Exposed Interface:
 *   truck.getName() -> get the ID of this truck
 *   truck.deliver() -> will take care of everything
 * Possible expansion points:
 *   External modules could inject into the trucks an external Driver instance with
 *   a more complex algorithm for driving the truck.
 *   this way we can upgrade the driving engine without affecting the truck.
 */
(function ($) {

    //-------------------------------------------------
    // private closure space, used for static functions
    //-------------------------------------------------

    //static variable and function for assigning unique IDs to trucks.
    var trackId = 0;

    function nextTruckId() {
        return ++trackId;
    }

    test.delivery.Truck = {
        create: function (source, depot) {
            var parcels = [],            //parcel this truck will have to deliver
                originalLocation,        //initial location of the truck
                self,                    //the truck that we'll return from this create function call
                id = nextTruckId(),        //unique ID for this truck
                speed = test.util.rand(3000, 6000), //speed of this truck
                driver;    //driver engine used. defaults to a basic jQuery animate engine

            //-------------------------------------
            // Internal private functions
            //-------------------------------------
            //return the name of the topic used from this truck to publish events (or create a new one)
            function getQueue(name) {
                tash.events.require('test.events.truck_' + self.getName());
                if (name) {
                    tash.events.require('test.events.truck_' + self.getName() + (name ? '.' + name : ''));
                }
                return name ? test.events['truck_' + self.getName()][name] : test.events['truck_' + self.getName()];
            }

            function acquireParcels() {
                //drive to depot
                logProgress("acquiring parcels from depot ");
                driver.driveTo(depot.getPosition(), function completed() {
                    parcels = depot.getParcels();
                    getQueue('parcelsAcquired').publish([parcels]);
                });
            }

            /**
            * recursive function used to chain asynchronous events (parcel deliveries)
            */
            function deliverParcel(parcels, index) {
                if (index >= parcels.length) {
                    //iteration complete. signal process completion
                    getQueue('parcelsDelivered').publish(this);
                    return;
                }

                logProgress("delivering parcel to " + parcels[index].getName());

                driver.driveTo(parcels[index].getPosition(), function () {
                    deliverParcel(parcels, index + 1);
                }, this);
            }

            function logProgress(msg) {
                getQueue().publish([self, msg ]);
            }

            function initFiniteStateAutomaton() {
                //register listeners for events
                getQueue('parcelsNotAcquired').subscribe(function () {
                    logProgress("nothing to deliver");
                    //transition to deliveryCompleted.
                    getQueue('deliveryCompleted').publish();
                });

                getQueue('parcelsAcquired').subscribe(function (parcels) {
                    logProgress("acquired " + parcels.length + " parcels from depot." +
                                            (parcels.length > 0 ? " ready for delivery" : "nothing to deliver"));
                    //start delivering the parcels, starting from the first one
                    deliverParcel(parcels, 0);
                });

                getQueue('parcelsDelivered').subscribe(function () {
                    getQueue('deliveryCompleted').publish();
                });

                getQueue('deliveryCompleted').subscribe(function () {
                    //get back to base
                    logProgress("back to base");
                    driver.driveTo(originalLocation, function () {
                        logProgress("delivery completed");
                    });
                });
            }

            //---------------------------------------------
            // privileged API functions
            //---------------------------------------------
            function _deliver() {
                logProgress('Starting delivering');
                acquireParcels();
            }

            function _setDriver(truckDriver) {
                if (truckDriver && typeof truckDriver.driveTo === 'function') {
                    driver = truckDriver;
                    return true;
                }
                return false;
            }

            //---------------------------------------------
            // Main Logic
            //---------------------------------------------

            //default driver used to drive the truck
            driver = {
                //move to a specific destination in space
                driveTo: function (pos, completeCB, scope) {
                    //Look for a registered driving engine. to be done in phase 2

                    //by now, it's just a simple jQuery animate call
                    $(source).animate({
                        left: pos.x - (self.getPosition().width),
                        top: pos.y
                    }, speed, function complete() {
                        //if a complete callback is provided, let's call it
                        if (typeof completeCB === 'function') {
                            completeCB.call(scope || this);
                        }
                    });
                }
            };

            self = test.OO.extend(test.delivery.BaseEntity.create(source), {
                _constructor: function (/*source*/) {
                    originalLocation = this.getPosition();
                    originalLocation.x = originalLocation.x + this.getPosition().width;
                },

                /* @override getName, returning the ID of this truck */
                getName: function () {
                    return id;
                },

                deliver: _deliver,
                setDriver: _setDriver
            }, source);

            self.el = source;

            //Add automaton behavior to this instance
            initFiniteStateAutomaton();

            return self;
        }
    };
}(jQuery));

/**
 * very basic exception classes
 */
test.delivery.errors = {
    create: function (errId) {
        return {
            id: errId,
            message: this[errId]
        };
    },

    ENOARGS: 'Not enough arguments or arguments not initialized'
};

/**
 * This guy will be used to log messages coming from the truck to a panel
 */
test.delivery.TruckLogger = {
    create: function (truck, containerEl) {
        var loggerEl;

        if (!containerEl) {
            containerEl = $(document.body);
        }

        loggerEl = $(test.util.Screen.template(this.templates.logger, {id: truck.getName(), bgcolor: truck.el.css('background-color')}));
        containerEl.append(loggerEl);
        loggerEl = loggerEl.find('.section');

        tash.events.require('test.events.truck_' + truck.getName());

        test.events['truck_' + truck.getName()].subscribe(function (truck, message) {
            //clear active element from the panel
            $('p.last', loggerEl).removeClass('last');
            //loggerEl.prepend( "<p class='last'>" + message + "</p>" );
            loggerEl.append("<p class='last'>" + message + "</p>");
        });

        //no exposed API for the logger
        return {
        };
    }
};

test.delivery.TruckLogger.templates = {
    logger: [
        "<div class='truck_logger' id='truck_logger_{{id}}'>",
        "   <h1>Events from Truck {{id}} <span class='icon' style='background-color:{{bgcolor}}'>&nbsp;</span></h1>",
        "   <div class='section'></div>",
        "</div>"
    ].join('')
};


/*
 * MAIN LOGIC
 *----------------------------------------------*/

jQuery(document).ready(function () {
    test.delivery.App.run();

});