/**
 * The MIT License (MIT)
 *
 * Copyright (c) 2014 Jarry Cao
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */
( function( window ) {
  "use strict";
  var count = 0,
    todoFn = function( obj ) {
      return obj;
    },
    TODO = "todo",
    DONE = "done",
    FAIL = "fail",
    PROGRESS = "progress";

  /**
   * @see http://wiki.commonjs.org/wiki/Promises/A <br />
   * <a target="_parent" href="../../../../test/test/assets/base/Promise.html" >Demo when Test</a>
   * @public
   * @class Promise
   * @example
   * new Promise(function(){}, function(){})
   * new Promise(function(){})
   * new Promise()
   * Promise() equivalence new Promise()
   */

  /**
   * @inner
   * @alias Promise
   * @constructor
   */
  var Promise = function( todo, fail, progress ) {
    if ( Promise.constructorOf( this ) ) {
      this.init( todo, fail, progress );
    } else {
      return new Promise( todo, fail, progress );
    }
  };

  Promise.prototype = {
    constructor: Promise,
    /**
     * Do next resolve.
     * @private
     */
    _nextResolve: function( result, enforce ) {
      var
        allDone = this.state === DONE,
        next = this.next,
        whensState;

      if ( allDone || enforce ) {
        whensState = this._checkWhensState( result );
        allDone = whensState.size === whensState[ DONE ] + whensState[ FAIL ];
      }

      if ( allDone ) {
        result = whensState.result;
        if ( next ) {
          next.resolve( result );
        } else {
          this._finally( result, DONE );
        }
      }
      return this;
    },
    /**
     * @private
     */
    _checkWhensState: function( result ) {
      var
        i = 0,
        len = this.whens.length,
        whensState = {
          size: len,
          result: len ? [ result ] : result
        },
        promise;

      whensState[ TODO ] = 0;
      whensState[ PROGRESS ] = 0;
      whensState[ FAIL ] = 0;
      whensState[ DONE ] = 0;

      for ( ; i < len; i++ ) {
        promise = this.whens[ i ];
        whensState[ promise.state ]++;
        whensState.result.push( promise.result );
      }

      return whensState;
    },
    /**
     * Do next reject.
     * @private
     */
    _nextReject: function( result, Finally ) {
      var next = this.next,
        whensState = this._checkWhensState( result ),
        allDone = whensState.size === whensState[ DONE ] + whensState[ FAIL ];

      if ( allDone ) {
        result = whensState.result;
        if ( next && !Finally ) {
          this.next.reject( result );
        } else {
          this._finally( result, FAIL );
        }
      }

      return this;
    },
    /**
     * Push promise.
     * @private
     */
    _push: function( nextPromise ) {
      this.whens.push( nextPromise );
      return this;
    },
    /**
     * Call todo, fail or progress.
     * @param {String} - Function name.
     * @param {*}
     * @returns {*}
     */
    call: function( name, result ) {
      switch ( name ) {
        case FAIL:
        case PROGRESS:
        case TODO:
          break;
        default:
          name = TODO;
      }

      return this[ name ].call( this.context, result );
    },
    /**
     * Get property
     * @param {String} - Property name.
     * @returns {*}
     */
    get: function( propertyName ) {
      return this[ propertyName ];
    },
    /**
     * @param {Object} - Context of Promise.
     * @returns {this}
     */
    withContext: function( context ) {
      this.context = context;
      return this;
    },
    /**
     * @private
     */
    _withoutPrev: function( todo, fail, progress ) {
      if ( Promise.constructorOf( todo ) ) {
        if ( todo.prev ) {
          fail = todo.fail;
          progress = todo.progress;
          todo = todo.todo;
        } else {
          return todo;
        }
      }
      return Promise( todo, fail, progress );
    },
    /**
     * Then do...
     * @param [nextToDo] {Function|Promise} - Todo.
     * @param [nextFail] {Function} - Fail next.
     * @param [nextProgress] {Function} - Progress.
     * @returns {Promise}
     */
    then: function( nextToDo, nextFail, nextProgress ) {
      if ( this.next ) {
        return this.next;
      }

      var promise = this._withoutPrev( nextToDo, nextFail, nextProgress );

      if ( this.context !== this ) {
        promise.withContext( this.context );
      }
      promise.prev = this;

      this.next = promise;

      switch ( this.state ) {
        case FAIL:
          break;
        case DONE:
          this._nextResolve( this.result );
          break;
        default:
          break;
      }

      return promise;
    },
    /**
     * @constructs
     * @param {Function=}
     * @param {Function=}
     * @param {Function=}
     */
    init: function( todo, fail, progress ) {
      this.context = this;
      this.__promiseFlag = true;
      this.state = TODO;
      this.result = null;
      this.whens = [];
      this.todo = todo || todoFn;
      this.fail = fail || todoFn;
      this.progress = progress || todoFn;
      this.prev = null;
      this.id = count++;
      this.next = null;
      this._done = null;
      return this;
    },
    /**
     * Add a function which be call finally.<br/>
     * Add a promise instance will call resolve.<br/>
     * If add 'done' then destroy promise from root.
     * @parma {Function|Promise} - todo
     * @parma {Function} - fail
     * @returns {Promise} - Return root promise. So you can done().resolve(); .
     */
    done: function( todo, fail ) {
      var end = this.end();
      if ( !end._done ) {
        end._done = Promise.constructorOf( todo ) ? todo : Promise( todo, fail );
      } else {
        end._done.done( todo, fail );
      }

      return this.root();
    },
    /**
     * Do it when finish all task or fail.
     * @private
     */
    _finally: function( result, state ) {
      var end = this.end();
      if ( end._done && !end._done.isComplete() ) {
        end._done.withContext( this.context );
        if ( state === DONE ) {
          end._done.resolve( result );
        } else if ( state === FAIL ) {
          end._done.reject( result );
        }
        // root.destroy();
      }
      return this;
    },

    _clearProp: function() {
      this.result = null;
      this.whens = [];
      this.todo = todoFn;
      this.fail = todoFn;
      this.progress = todoFn;
      this.prev = null;
      this.next = null;
      this.state = TODO;
      this._done = null;
      return this;
    },
    /**
     * Destroy self.
     * @returns {void}
     */
    destroy: function() {
      var whens = this.whens,
        i, len = whens.length,
        promise;
      for ( i = len - 1; i >= 0; i-- ) {
        promise = whens[ i ];
        promise.destroy();
        promise = whens.pop();
      }

      if ( this.parent ) {
        this.parent.next = null;
      }

      if ( this.next ) {
        this.next.destroy();
      }

      this._clearProp();
    },
    /**
     * @param {*=} - result.
     * @returns {this}
     */
    resolve: function( obj ) {
      if ( this.isComplete() ) {
        return this;
      }

      try {
        this.state = DONE;
        this.result = this.call( TODO, obj );

      } catch ( e ) {
        this.state = TODO;
        return this.reject( obj );
      }

      if ( Promise.constructorOf( this.result ) && this.result !== this ) {
        var promise = this.result._done || this.result;
        switch ( promise.state ) {
          case DONE:
            this.result = promise.result;
            this._nextResolve( this.result );
            return this._resolveWhens( obj );
          case Promise:
            this.result = promise.result;
            return this.reject( this.result );
        }
        this.state = PROGRESS;
        var self = this,
          todo = function( result ) {
            self.state = DONE;
            self.result = result;
            self._nextResolve( result );
            self = fail = todo = progress = null;
            promise.next.destroy();
          },
          fail = this.result.fail,
          progress = this.result.progress;

        this.state = TODO;

        if ( promise.state === FAIL ) {
          self.reject( promise.result );
          self = fail = todo = progress = null;
        } else {
          promise.fail = function( result ) {
            fail.call( promise.context, result );
            self.reject( result );
            self = fail = todo = progress = null;
            promise.next.destroy();
          };
        }

        promise.then( todo );

      } else {
        this._nextResolve( this.result );
      }
      return this._resolveWhens( obj );
    },
    /**
     * @private
     */
    _resolveWhens: function( result ) {
      for ( var i = 0, len = this.whens.length, when; i < len; i++ ) {
        when = this.whens[ i ];
        when.prev || when.state !== PROGRESS && when.resolve( result );
      }
      return this;
    },
    /**
     * @private
     */
    _reprocessWhens: function( result ) {
      for ( var i = 0, len = this.whens.length; i < len; i++ ) {
        this.whens[ i ].reprocess( result );
      }
      return this;
    },
    /**
     * If fail return a promise then do next.
     * @param {*=} - result.
     * @returns {this}
     */
    reject: function( result ) {
      if ( this.isComplete() ) {
        return this;
      }

      this.state = FAIL;
      this.result = this.call( FAIL, result );

      if ( Promise.constructorOf( this.result ) && this.result !== this ) {
        var promise = this.result;
        switch ( promise.state ) {
          case DONE:
            this.result = promise.result;
            this._nextResolve( this.result, true );
            break;
          case FAIL:
            this.result = promise.result;
            this._nextReject( this.result );
            break;
        }

      } else {
        this._nextReject( this.result, true );
      }
      return this._resolveWhens( result );
    },
    /**
     * If result is a Promise then resolve or reject.
     * @param {*=} obj
     * @returns {this}
     */
    reprocess: function( obj ) {
      if ( this.isComplete() ) {
        return this;
      }
      this.state = PROGRESS;
      var result = this.call( PROGRESS, obj );

      if ( Promise.constructorOf( result ) && result !== this ) {
        this.state = TODO;
        switch ( result.state ) {
          case TODO:
            this.resolve( result.resolve( obj ).result );
            break;
          case DONE:
            this.resolve( result.result );
            break;
          case FAIL:
            this.reject( result.result );
            break;
        }
      }
      return this._reprocessWhens( obj );
    },
    /**
     * The new promise is siblings
     * @param [todo] {Function|Promise}
     * @param [fail] {Function}
     * @param [progress] {Function}
     * @returns {Promise}
     * @example new Promise().when(todo).when(todo);
     */
    when: function( todo, fail, progress ) {
      var promise = Promise.constructorOf( todo ) ? todo : Promise( todo, fail, progress ),
        self = this,
        fn = function( result ) {
          self._doNext( result );
          return result;
        };
      this._push( promise );
      switch ( promise.state ) {
        case DONE:
        case FAIL:
          return this._doNext( promise.result );
        case PROGRESS:
          promise.done( fn, fn );
          return this;
        case TODO:
          promise.done( fn, fn );
          if ( this.isComplete() && !promise.prev ) {
            promise.resolve( this.result );
          }
          return this;
      }
    },
    /**
     * Add multi task.
     * @param {...Function|Promise}
     * @returns {Promise}
     * @example new Promise().multWhen(todo, promise);
     */
    multiWhen: function() {
      for ( var i = 0, len = arguments.length; i < len; i++ ) {
        this.when( arguments[ i ] );
      }
      return this;
    },
    /**
     * @private
     */
    _doNext: function( result ) {
      var whensState = this._checkWhensState( result );
      if ( this.isComplete() && whensState.size === whensState[ DONE ] + whensState[ FAIL ] ) {
        if ( whensState[ FAIL ] || this.state === FAIL ) {
          this._nextReject( this.result );
        } else {
          this._nextResolve( this.result, true );
        }
      }
      return this;
    },
    /**
     * Get root promise.
     * @returns {Promise}
     */
    root: function() {
      var prev = this;
      while ( prev.prev ) {
        prev = prev.prev;
      }
      return prev;
    },
    /**
     * Get end promise.
     * @returns {Promise}
     */
    end: function() {
      var end = this;
      while ( end.next ) {
        end = end.next;
      }
      return end;
    },
    /**
     * The promise is complete. fail or done return true.
     * @returns {Boolean}
     */
    isComplete: function() {
      return this.state === DONE || this.state === FAIL;
    }
  };

  /**
   * Whether it is "Promise" instances.
   * @param {Promise}
   * @returns {Boolean}
   */
  Promise.constructorOf = function( promise ) {
    return promise instanceof Promise || ( promise ? promise.__promiseFlag === true : false );
  };

  /**
   * Group a list of Promise.
   * @param {...Promise|Array<Promise>}
   * @returns {Boolean}
   */
  Promise.group = function( args ) {
    var array = args instanceof Array ? args : arguments,
      promise = array[ 0 ],
      i = 1,
      len = array.length;
    for ( ; i < len; i++ ) {
      promise.when( array[ i ] );
    }
    return promise;
  };

  if ( typeof exports !== "undefined" ) {
    if ( typeof module !== "undefined" && module.exports ) {
      exports = module.exports = Promise;
    }
    exports.Promise = Promise;
  } else if ( typeof define === "function" && define.amd ) {
    define( function() {
      return Promise;
    } );
  } else {
    window.Promise = Promise;
  }
} )( window );
