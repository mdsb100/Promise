( function( window ) {
	"use strict";
	var count = 0,
		todoFn = function( obj ) {
			return obj;
		},
		andFn = function( result ) {
			var andsState = this._checkAndsState( result );
			if ( this.isComplete() && andsState.size === andsState[ Promise.DONE ] + andsState[ Promise.FAIL ] ) {
				if ( andsState[ Promise.FAIL ] || this.state === Promise.FAIL ) {
					this._nextReject( this.result );
				} else {
					this._nextResolve( this.result, true );
				}
			}
		};

	/**
	 * @see http://wiki.commonjs.org/wiki/Promises/A <br />
	 * <a target="_parent" href="../../../../test/test/assets/base/Promise.html" >Demo and Test</a>
	 * @public
	 * @module Promise
	 * @example
	 * new Promise(function(){}, function(){})
	 * new Promise(function(){})
	 * new Promise()
	 * Promise() equivalence new Promise()
	 */

	/**
	 * @inner
	 * @alias module:Promise
	 * @constructor
	 */
	function Promise( todo, fail, progress ) {
		if ( Promise.constructorOf( this ) ) {
			this.init( todo, fail, progress );
		} else {
			return new Promise( todo, fail, progress );
		}
	}


	Promise.TODO = "todo";
	Promise.DONE = "done";
	Promise.FAIL = "fail";
	Promise.PROGRESS = "progress";


	Promise.prototype = {
		constructor: Promise,
		/**
		 * Do next resolve.
		 * @private
		 */
		_nextResolve: function( result, enforce ) {
			var
				allDone = this.state === Promise.DONE,
				next = this.next,
				andsState;

			if ( allDone || enforce ) {
				andsState = this._checkAndsState( result );
				allDone = andsState.size === andsState[ Promise.DONE ] + andsState[ Promise.FAIL ];
			}

			if ( allDone ) {
				result = andsState.result;
				if ( next ) {
					next.resolve( result );
				} else {
					this._finally( result, Promise.DONE );
				}
			}
			return this;
		},
		/**
		 * @private
		 */
		_checkAndsState: function( result ) {
			var
				i = 0,
				len = this.ands.length,
				andsState = {
					size: len,
					result: len ? [ result ] : result
				},
				promise;

			andsState[ Promise.TODO ] = 0;
			andsState[ Promise.PROGRESS ] = 0;
			andsState[ Promise.FAIL ] = 0;
			andsState[ Promise.DONE ] = 0;

			for ( ; i < len; i++ ) {
				promise = this.ands[ i ];
				andsState[ promise.state ]++;
				andsState.result.push( promise.result );
			}

			return andsState;
		},
		/**
		 * Do next reject.
		 * @private
		 */
		_nextReject: function( result, Finally ) {
			var next = this.next,
				andsState = this._checkAndsState( result ),
				allDone = andsState.size === andsState[ Promise.DONE ] + andsState[ Promise.FAIL ];

			if ( allDone ) {
				result = andsState.result;
				if ( next && !Finally ) {
					this.next.reject( result );
				} else {
					this._finally( result, Promise.FAIL );
				}
			}

			return this;
		},
		/**
		 * Push promise.
		 * @private
		 */
		_push: function( nextPromise ) {
			this.ands.push( nextPromise );
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
				case Promise.FAIL:
				case Promise.PROGRESS:
				case Promise.TODO:
					break;
				default:
					name = Promise.TODO;
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
		_createPromiseWithoutPrev: function( todo, fail, progress ) {
			if ( Promise.constructorOf( todo ) ) {
				if ( todo.prev ) {
					fail = todo.fail;
					progress = todo.progress;
					todo = todo.todo;
				} else {
					return todo;
				}
			}
			return new Promise( todo, fail, progress );
		},
		/**
		 * Then do...
		 * @param [nextToDo] {Function|module:base/Promise} - Todo.
		 * @param [nextFail] {Function} - Fail next.
		 * @param [nextProgress] {Function} - Progress.
		 * @returns {module:base/Promise}
		 */
		then: function( nextToDo, nextFail, nextProgress ) {
			if ( this.next ) {
				return this.next;
			}

			var promise = this._createPromiseWithoutPrev( nextToDo, nextFail, nextProgress );

			if ( this.context !== this ) {
				promise.withContext( this.context );
			}
			promise.prev = this;

			this.next = promise;

			switch ( this.state ) {
				case Promise.FAIL:
					break;
				case Promise.DONE:
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
			this.state = Promise.TODO;
			this.result = null;
			this.ands = [];
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
		 * @returns {module:base/Promise} - Return root promise. So you can done().resolve(); .
		 */
		done: function( todo, fail ) {
			var root = this.root();
			root._done = Promise.constructorOf( todo ) ? todo : new Promise( todo, fail );
			return root;
		},
		/**
		 * Do it when finish all task or fail.
		 * @private
		 */
		_finally: function( result, state ) {
			var root = this.root();
			if ( root._done && !root._done.isComplete() ) {
				root._done.withContext( this.context );
				if ( state === Promise.DONE ) {
					root._done.resolve( result );
				} else if ( state === Promise.FAIL ) {
					root._done.reject( result );
				}
				// root.destroy();
			}
			return this;
		},

		_clearProperty: function() {
			this.result = null;
			this.ands = [];
			this.todo = todoFn;
			this.fail = todoFn;
			this.progress = todoFn;
			this.prev = null;
			this.next = null;
			this.state = Promise.TODO;
			this._done = null;
			return this;
		},
		/**
		 * Destroy self.
		 * @returns {void}
		 */
		destroy: function() {
			var ands = this.ands,
				i, len = ands.length,
				promise;
			for ( i = len - 1; i >= 0; i-- ) {
				promise = ands[ i ];
				promise.destroy();
				promise = ands.pop();
			}

			if ( this.parent ) {
				this.parent.next = null;
			}

			if ( this.next ) {
				this.next.destroy();
			}

			this._clearProperty();
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
				this.state = Promise.DONE;
				this.result = this.call( Promise.TODO, obj );
			} catch ( e ) {
				this.state = Promise.TODO;
				return this.reject( obj );
			}

			if ( Promise.constructorOf( this.result ) && this.result !== this ) {
				var promise = this.result._done || this.result;
				switch ( promise.state ) {
					case Promise.DONE:
						this.result = promise.result;
						this._nextResolve( this.result );
						return this._resolveAnds( obj );
					case Promise:
						this.result = promise.result;
						return this.reject( this.result );
				}
				var self = this,
					todo = function( result ) {
						self.state = Promise.DONE;
						self.result = result;
						self._nextResolve( result );
						self = fail = todo = progress = null;
						promise.next.destroy();
					},
					fail = this.result.fail,
					progress = this.result.progress;

				this.state = Promise.TODO;

				if ( promise.state === Promise.FAIL ) {
					self.reject( promise.result );
					self = fail = todo = progress = null;
				} else {
					promise.fail = function( result ) {
						fail.call( promise.context, result );
						self.reject( result );
						self = fail = todo = progress = null;
						promise.next.destroy();
					}
				}

				// promise.progress = function( result ) {
				//  progress.call( promise.context, result );
				//  return self.reprocess( result );
				// }

				promise.then( todo );

			} else {
				this._nextResolve( this.result );
			}
			return this._resolveAnds( obj );
		},
		/**
		 * @private
		 */
		_resolveAnds: function( result ) {
			for ( var i = 0, len = this.ands.length; i < len; i++ ) {
				this.ands[ i ].resolve( result );
			}
			return this;
		},
		/**
		 * @private
		 */
		_reprocessAnds: function( result ) {
			for ( var i = 0, len = this.ands.length; i < len; i++ ) {
				this.ands[ i ].reprocess( result );
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

			this.state = Promise.FAIL;
			this.result = this.call( Promise.FAIL, result );

			if ( Promise.constructorOf( this.result ) && this.result !== this ) {
				var promise = this.result;
				switch ( promise.state ) {
					case Promise.DONE:
						this.result = promise.result;
						this._nextResolve( this.result, true );
						break;
					case Promise.FAIL:
						this.result = promise.result;
						this._nextReject( this.result );
						break;
				}

			} else {
				this._nextReject( this.result, true );
			}
			return this._resolveAnds( result );
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
			this.state = Promise.PROGRESS;
			var result = this.call( Promise.PROGRESS, obj );

			if ( Promise.constructorOf( result ) && result !== this ) {
				this.state = Promise.TODO;
				switch ( result.state ) {
					case Promise.TODO:
						this.resolve( result.resolve( obj ).result );
						break;
					case Promise.DONE:
						this.resolve( result.result );
						break;
					case Promise.FAIL:
						this.reject( result.result );
						break;
				}
			}
			return this._reprocessAnds( obj );
		},
		/**
		 * The new promise is siblings
		 * @param [todo] {Function|module:base/Promise}
		 * @param [fail] {Function}
		 * @param [progress] {Function}
		 * @returns {module:base/Promise}
		 * @example new Promise().and(todo).and(todo);
		 */
		and: function( todo, fail, progress ) {
			var promise = this._createPromiseWithoutPrev( todo, fail, progress ).withContext( this ).done( andFn, andFn );
			this._push( promise );
			if ( this.isComplete() ) {
				promise.resolve( this.result );
			}
			return this;
		},
		/**
		 * Get root promise.
		 * @returns {module:base/Promise}
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
		 * @returns {module:base/Promise}
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
			return this.state === Promise.DONE || this.state === Promise.FAIL;
		}
	};

	/**
	 * Whether it is "Promise" instances.
	 * @param {module:base/Promise}
	 * @returns {Boolean}
	 */
	Promise.constructorOf = function( promise ) {
		return promise instanceof Promise || ( promise ? promise.__promiseFlag === true : false );
	}
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