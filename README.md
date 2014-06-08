#A JavaScript Library: Promise/A

Platform: any web broswer, nodejs. Module managerment: AMD/CMD.

##What problems can 'Promise' solve?

'Promise' can solve various asynchronous operation, like: AJAX request, IO file, user behavior...

You may use it for asynchronous or synchronous.

_Quick start_
```
var promise = new Promise(function(result){
  //expect(result).equal(0);
  return result + 1;
}).then(function(result){
  //expect(result).equal(1);
}).then(function(){
  var promise = new Promise();
  setTimeout(function(){
    // After 0.2 seconds to go next task. An asynchronous operation.
    promise.resolve("resolve");
  }, 200);
  return promise;
}).then(function(result){
  //expect(result).equal("resolve");
  var promise = new Promise(function(result){
    return result;
  });
  promise.resolve("resolve by sync");
  return promise;
}).then(function(result){
  //expect(result).equal("resolve by sync");
  return "done";
}).done(function(result){
  //expect(result).equal("done");
}).resolve(0);

// Promise() equals new Promise()

```

_Return a new Promise to do an asynchronous operation_
```
then(function(){
  var promise = new Promise();
  ajax({
    callback: function(result){
      promise.resolve(result);
    }
  });
  return promise;
})

```

_Only three parameters_
```
var promise = Promise().then(todo, fail, process);
var promise = Promise(todo, fail)
var promise = Promise(todo);
// If you use then like this.
var promise = Promise().then();
// It eqauls
Promise(function(result){
  return result;
}).then(function(preResult){
  return preResult;
});
```
Normally, we just need use 'todo' and 'fail'.

_Main Methods_

then - We do work then to do next.
```
Promise().then(function(){}).then(function(){}).then(function(){});
```
and - We do work and do another work. When all of thing is done, then to do next.
The result of next 'Promise' is an array, if you use 'and'.
```
function delay(ms, expect) {
    return function(result) {
      var promise = new Promise();
      //expect(result, "in delay").equal(0);
      setTimeout(function() {
        promise.resolve(ms);
      }, ms);
      return promise;
    };
};
Promise(function(result){
  expect(result).equal(0);
  return result;
})
.and(function(result){
  return Promise().resolve("and sync with promise");
})
.and(delay(100, expect))
.and(delay(200, expect))
.and(function(result){
  return "middle";
})
.and(delay(300, expect))
.and(function(result){
  expect(result).equal(0);
  return "and sync";
}).then(function(result){
  expect(result).be.array();
  expect(result).have.length(7);
  return result;
})
.done().resolve(0);
```
done - Finally work to do.
```
Promise().then(function(){}).then(function(){}).done(function(){},function(){},function(){});
```
resolve - Resolve next work.
```
Promise(function(result){
    //expect(result).equal(0);
}).then().done().resolve(0);
```
```
Promise(function(result){
    var promise = Promise()
    setTimeout(function(){
        promise.resolve(result+1)
    }, 2000);
    return promise;
}).then(function(1){
    //expect(result).equal(1);
}).done().resolve(0);
```
```
Promise(function(result){
    return Promise().resolve(result+1);
}).then(function(1){
    //expect(result).equal(1);
}).done().resolve(0);
```
```
Promise(function(result){
    throw 'fail';
}, function(result){
    //expect(result).equal(0);
    new Promise().resolve(result+1);
}).then(function(result){
    //expect(result).equal(1);
}).done().resolve(0);
```
reject - Reject it then go to failure
```
Promise(function(){}
,function(result){
    //expect(result).equal(0);
    return result+1;
}).then().done(function(){}
, function(result){
    //expect(result).equal(1);
}).reject(0);
```
```
Promise(function(result){
    var promise = Promise()
    setTimeout(function(){
        promise.reject(result+1)
    }, 2000);
    return promise;
}).then(function(1){
    //expect(result).equal(1);
}).done().resolve(0);
```
```
Promise(function(result){}, function(result){
    //expect(result).equal(0);
    //logger("Reject return instance promise, it will do next.");
    return Promise().resolve(0);
})
.then(function(result){
    expect(result).equal(0);
    var promise = Promise();
    setTimeout(function(){
        promise.reject("goto done");
    }, 100);
    return promise;
})
.then(function(result){
    //logger("It does not be call");
    //expect(result).not.equal(1);
}, function(result){
    //logger("It does not be call");
    //expect(result).not.equal(1);
})
.done(function(result){}, function(result){
    expect(result).equal("goto done");
}).reject(0);
```
```
Promise(function(result){
    //logger("go to fail function");
    throw '123';
}, function(result){
    //expect(result).equal(0);
    //logger("Reject return instance promise, it will do next.");
    return Promise().resolve(result);
})
.then(function(result){
    //expect(result).equal(0);
    var promise = Promise();
    promise.reject("goto fail");
    return promise;
}, function(result){
    //expect(result).equal("goto fail");
    var promise = Promise();
    //!!!If you use this then next failure function will be call.
    promise.reject("goto next reject");
    return promise;
})
.then(function(result){
    logger("It does not be call");
    expect(result).not.equal(1);
}, function(result){
    //expect(result).equal("goto next reject");
    return "goto done";
})
.done(function(result){
}, function(result){
    //expect(result).equal("goto done");
    resolvePromise.resolve("next reject");
}).resolve(0);
```
reprocess - Process progress.
```
var sum = 0;
var promise = new Promise(function(result){
    //expect(result).equal("goto done");
    return result;
}, function(){}, function(interval){
    if(sum === 10){
        clearInterval(interval);
        return new Promise(function(){
            return "goto done"
        });
    }
    sum++;
}).done(function(result){
    //expect(sum).equal(10);
    //expect(result).equal("goto done");
    return "next and";
});
var interval = setInterval(function(){
    promise.reprocess(interval);
}, 20);
```
root - Get root promise.
```
var root = promise();
root === root.then(function(){}).then(function(){}).root(); // true
```
end - Get end promise.
```
var root = promise();
root.then(function(){}).then(function(){}) === root.end(); // true
```

_More demo to undeserstand_

[Test](http://mdsb100.github.io/homepage/amdquery/test/test/assets/base/Promise.html)

[Practice](https://github.com/mdsb100/AMDQuery/blob/master/amdquery/main/communicate.js)
