const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["./pixi-CkHiphy-.js","./core-DXTCsXNm.js","./cubism4.es-B88CTxaG.js"])))=>i.map(i=>d[i]);
var jsxRuntime = { exports: {} };
var reactJsxRuntime_production_min = {};
var react = { exports: {} };
var react_production_min = {};
/**
 * @license React
 * react.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
var l$1 = Symbol.for("react.element"), n$1 = Symbol.for("react.portal"), p$2 = Symbol.for("react.fragment"), q$1 = Symbol.for("react.strict_mode"), r = Symbol.for("react.profiler"), t = Symbol.for("react.provider"), u = Symbol.for("react.context"), v$1 = Symbol.for("react.forward_ref"), w = Symbol.for("react.suspense"), x = Symbol.for("react.memo"), y = Symbol.for("react.lazy"), z$1 = Symbol.iterator;
function A$1(a) {
  if (null === a || "object" !== typeof a) return null;
  a = z$1 && a[z$1] || a["@@iterator"];
  return "function" === typeof a ? a : null;
}
var B$1 = { isMounted: function() {
  return false;
}, enqueueForceUpdate: function() {
}, enqueueReplaceState: function() {
}, enqueueSetState: function() {
} }, C$1 = Object.assign, D$1 = {};
function E$1(a, b, e) {
  this.props = a;
  this.context = b;
  this.refs = D$1;
  this.updater = e || B$1;
}
E$1.prototype.isReactComponent = {};
E$1.prototype.setState = function(a, b) {
  if ("object" !== typeof a && "function" !== typeof a && null != a) throw Error("setState(...): takes an object of state variables to update or a function which returns an object of state variables.");
  this.updater.enqueueSetState(this, a, b, "setState");
};
E$1.prototype.forceUpdate = function(a) {
  this.updater.enqueueForceUpdate(this, a, "forceUpdate");
};
function F() {
}
F.prototype = E$1.prototype;
function G$1(a, b, e) {
  this.props = a;
  this.context = b;
  this.refs = D$1;
  this.updater = e || B$1;
}
var H$1 = G$1.prototype = new F();
H$1.constructor = G$1;
C$1(H$1, E$1.prototype);
H$1.isPureReactComponent = true;
var I$1 = Array.isArray, J = Object.prototype.hasOwnProperty, K$1 = { current: null }, L$1 = { key: true, ref: true, __self: true, __source: true };
function M$1(a, b, e) {
  var d, c = {}, k2 = null, h = null;
  if (null != b) for (d in void 0 !== b.ref && (h = b.ref), void 0 !== b.key && (k2 = "" + b.key), b) J.call(b, d) && !L$1.hasOwnProperty(d) && (c[d] = b[d]);
  var g = arguments.length - 2;
  if (1 === g) c.children = e;
  else if (1 < g) {
    for (var f2 = Array(g), m2 = 0; m2 < g; m2++) f2[m2] = arguments[m2 + 2];
    c.children = f2;
  }
  if (a && a.defaultProps) for (d in g = a.defaultProps, g) void 0 === c[d] && (c[d] = g[d]);
  return { $$typeof: l$1, type: a, key: k2, ref: h, props: c, _owner: K$1.current };
}
function N$1(a, b) {
  return { $$typeof: l$1, type: a.type, key: b, ref: a.ref, props: a.props, _owner: a._owner };
}
function O$1(a) {
  return "object" === typeof a && null !== a && a.$$typeof === l$1;
}
function escape(a) {
  var b = { "=": "=0", ":": "=2" };
  return "$" + a.replace(/[=:]/g, function(a2) {
    return b[a2];
  });
}
var P$1 = /\/+/g;
function Q$1(a, b) {
  return "object" === typeof a && null !== a && null != a.key ? escape("" + a.key) : b.toString(36);
}
function R$1(a, b, e, d, c) {
  var k2 = typeof a;
  if ("undefined" === k2 || "boolean" === k2) a = null;
  var h = false;
  if (null === a) h = true;
  else switch (k2) {
    case "string":
    case "number":
      h = true;
      break;
    case "object":
      switch (a.$$typeof) {
        case l$1:
        case n$1:
          h = true;
      }
  }
  if (h) return h = a, c = c(h), a = "" === d ? "." + Q$1(h, 0) : d, I$1(c) ? (e = "", null != a && (e = a.replace(P$1, "$&/") + "/"), R$1(c, b, e, "", function(a2) {
    return a2;
  })) : null != c && (O$1(c) && (c = N$1(c, e + (!c.key || h && h.key === c.key ? "" : ("" + c.key).replace(P$1, "$&/") + "/") + a)), b.push(c)), 1;
  h = 0;
  d = "" === d ? "." : d + ":";
  if (I$1(a)) for (var g = 0; g < a.length; g++) {
    k2 = a[g];
    var f2 = d + Q$1(k2, g);
    h += R$1(k2, b, e, f2, c);
  }
  else if (f2 = A$1(a), "function" === typeof f2) for (a = f2.call(a), g = 0; !(k2 = a.next()).done; ) k2 = k2.value, f2 = d + Q$1(k2, g++), h += R$1(k2, b, e, f2, c);
  else if ("object" === k2) throw b = String(a), Error("Objects are not valid as a React child (found: " + ("[object Object]" === b ? "object with keys {" + Object.keys(a).join(", ") + "}" : b) + "). If you meant to render a collection of children, use an array instead.");
  return h;
}
function S$1(a, b, e) {
  if (null == a) return a;
  var d = [], c = 0;
  R$1(a, d, "", "", function(a2) {
    return b.call(e, a2, c++);
  });
  return d;
}
function T$1(a) {
  if (-1 === a._status) {
    var b = a._result;
    b = b();
    b.then(function(b2) {
      if (0 === a._status || -1 === a._status) a._status = 1, a._result = b2;
    }, function(b2) {
      if (0 === a._status || -1 === a._status) a._status = 2, a._result = b2;
    });
    -1 === a._status && (a._status = 0, a._result = b);
  }
  if (1 === a._status) return a._result.default;
  throw a._result;
}
var U$1 = { current: null }, V$1 = { transition: null }, W$1 = { ReactCurrentDispatcher: U$1, ReactCurrentBatchConfig: V$1, ReactCurrentOwner: K$1 };
function X$1() {
  throw Error("act(...) is not supported in production builds of React.");
}
react_production_min.Children = { map: S$1, forEach: function(a, b, e) {
  S$1(a, function() {
    b.apply(this, arguments);
  }, e);
}, count: function(a) {
  var b = 0;
  S$1(a, function() {
    b++;
  });
  return b;
}, toArray: function(a) {
  return S$1(a, function(a2) {
    return a2;
  }) || [];
}, only: function(a) {
  if (!O$1(a)) throw Error("React.Children.only expected to receive a single React element child.");
  return a;
} };
react_production_min.Component = E$1;
react_production_min.Fragment = p$2;
react_production_min.Profiler = r;
react_production_min.PureComponent = G$1;
react_production_min.StrictMode = q$1;
react_production_min.Suspense = w;
react_production_min.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED = W$1;
react_production_min.act = X$1;
react_production_min.cloneElement = function(a, b, e) {
  if (null === a || void 0 === a) throw Error("React.cloneElement(...): The argument must be a React element, but you passed " + a + ".");
  var d = C$1({}, a.props), c = a.key, k2 = a.ref, h = a._owner;
  if (null != b) {
    void 0 !== b.ref && (k2 = b.ref, h = K$1.current);
    void 0 !== b.key && (c = "" + b.key);
    if (a.type && a.type.defaultProps) var g = a.type.defaultProps;
    for (f2 in b) J.call(b, f2) && !L$1.hasOwnProperty(f2) && (d[f2] = void 0 === b[f2] && void 0 !== g ? g[f2] : b[f2]);
  }
  var f2 = arguments.length - 2;
  if (1 === f2) d.children = e;
  else if (1 < f2) {
    g = Array(f2);
    for (var m2 = 0; m2 < f2; m2++) g[m2] = arguments[m2 + 2];
    d.children = g;
  }
  return { $$typeof: l$1, type: a.type, key: c, ref: k2, props: d, _owner: h };
};
react_production_min.createContext = function(a) {
  a = { $$typeof: u, _currentValue: a, _currentValue2: a, _threadCount: 0, Provider: null, Consumer: null, _defaultValue: null, _globalName: null };
  a.Provider = { $$typeof: t, _context: a };
  return a.Consumer = a;
};
react_production_min.createElement = M$1;
react_production_min.createFactory = function(a) {
  var b = M$1.bind(null, a);
  b.type = a;
  return b;
};
react_production_min.createRef = function() {
  return { current: null };
};
react_production_min.forwardRef = function(a) {
  return { $$typeof: v$1, render: a };
};
react_production_min.isValidElement = O$1;
react_production_min.lazy = function(a) {
  return { $$typeof: y, _payload: { _status: -1, _result: a }, _init: T$1 };
};
react_production_min.memo = function(a, b) {
  return { $$typeof: x, type: a, compare: void 0 === b ? null : b };
};
react_production_min.startTransition = function(a) {
  var b = V$1.transition;
  V$1.transition = {};
  try {
    a();
  } finally {
    V$1.transition = b;
  }
};
react_production_min.unstable_act = X$1;
react_production_min.useCallback = function(a, b) {
  return U$1.current.useCallback(a, b);
};
react_production_min.useContext = function(a) {
  return U$1.current.useContext(a);
};
react_production_min.useDebugValue = function() {
};
react_production_min.useDeferredValue = function(a) {
  return U$1.current.useDeferredValue(a);
};
react_production_min.useEffect = function(a, b) {
  return U$1.current.useEffect(a, b);
};
react_production_min.useId = function() {
  return U$1.current.useId();
};
react_production_min.useImperativeHandle = function(a, b, e) {
  return U$1.current.useImperativeHandle(a, b, e);
};
react_production_min.useInsertionEffect = function(a, b) {
  return U$1.current.useInsertionEffect(a, b);
};
react_production_min.useLayoutEffect = function(a, b) {
  return U$1.current.useLayoutEffect(a, b);
};
react_production_min.useMemo = function(a, b) {
  return U$1.current.useMemo(a, b);
};
react_production_min.useReducer = function(a, b, e) {
  return U$1.current.useReducer(a, b, e);
};
react_production_min.useRef = function(a) {
  return U$1.current.useRef(a);
};
react_production_min.useState = function(a) {
  return U$1.current.useState(a);
};
react_production_min.useSyncExternalStore = function(a, b, e) {
  return U$1.current.useSyncExternalStore(a, b, e);
};
react_production_min.useTransition = function() {
  return U$1.current.useTransition();
};
react_production_min.version = "18.3.1";
{
  react.exports = react_production_min;
}
var reactExports = react.exports;
/**
 * @license React
 * react-jsx-runtime.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
var f = reactExports, k = Symbol.for("react.element"), l = Symbol.for("react.fragment"), m$1 = Object.prototype.hasOwnProperty, n = f.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentOwner, p$1 = { key: true, ref: true, __self: true, __source: true };
function q(c, a, g) {
  var b, d = {}, e = null, h = null;
  void 0 !== g && (e = "" + g);
  void 0 !== a.key && (e = "" + a.key);
  void 0 !== a.ref && (h = a.ref);
  for (b in a) m$1.call(a, b) && !p$1.hasOwnProperty(b) && (d[b] = a[b]);
  if (c && c.defaultProps) for (b in a = c.defaultProps, a) void 0 === d[b] && (d[b] = a[b]);
  return { $$typeof: k, type: c, key: e, ref: h, props: d, _owner: n.current };
}
reactJsxRuntime_production_min.Fragment = l;
reactJsxRuntime_production_min.jsx = q;
reactJsxRuntime_production_min.jsxs = q;
{
  jsxRuntime.exports = reactJsxRuntime_production_min;
}
var jsxRuntimeExports = jsxRuntime.exports;
var reactDom = { exports: {} };
var reactDom_production_min = {};
var scheduler = { exports: {} };
var scheduler_production_min = {};
/**
 * @license React
 * scheduler.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
(function(exports) {
  function f2(a, b) {
    var c = a.length;
    a.push(b);
    a: for (; 0 < c; ) {
      var d = c - 1 >>> 1, e = a[d];
      if (0 < g(e, b)) a[d] = b, a[c] = e, c = d;
      else break a;
    }
  }
  function h(a) {
    return 0 === a.length ? null : a[0];
  }
  function k2(a) {
    if (0 === a.length) return null;
    var b = a[0], c = a.pop();
    if (c !== b) {
      a[0] = c;
      a: for (var d = 0, e = a.length, w2 = e >>> 1; d < w2; ) {
        var m2 = 2 * (d + 1) - 1, C2 = a[m2], n2 = m2 + 1, x2 = a[n2];
        if (0 > g(C2, c)) n2 < e && 0 > g(x2, C2) ? (a[d] = x2, a[n2] = c, d = n2) : (a[d] = C2, a[m2] = c, d = m2);
        else if (n2 < e && 0 > g(x2, c)) a[d] = x2, a[n2] = c, d = n2;
        else break a;
      }
    }
    return b;
  }
  function g(a, b) {
    var c = a.sortIndex - b.sortIndex;
    return 0 !== c ? c : a.id - b.id;
  }
  if ("object" === typeof performance && "function" === typeof performance.now) {
    var l2 = performance;
    exports.unstable_now = function() {
      return l2.now();
    };
  } else {
    var p2 = Date, q2 = p2.now();
    exports.unstable_now = function() {
      return p2.now() - q2;
    };
  }
  var r2 = [], t2 = [], u2 = 1, v2 = null, y2 = 3, z2 = false, A2 = false, B2 = false, D2 = "function" === typeof setTimeout ? setTimeout : null, E2 = "function" === typeof clearTimeout ? clearTimeout : null, F2 = "undefined" !== typeof setImmediate ? setImmediate : null;
  "undefined" !== typeof navigator && void 0 !== navigator.scheduling && void 0 !== navigator.scheduling.isInputPending && navigator.scheduling.isInputPending.bind(navigator.scheduling);
  function G2(a) {
    for (var b = h(t2); null !== b; ) {
      if (null === b.callback) k2(t2);
      else if (b.startTime <= a) k2(t2), b.sortIndex = b.expirationTime, f2(r2, b);
      else break;
      b = h(t2);
    }
  }
  function H2(a) {
    B2 = false;
    G2(a);
    if (!A2) if (null !== h(r2)) A2 = true, I2(J2);
    else {
      var b = h(t2);
      null !== b && K2(H2, b.startTime - a);
    }
  }
  function J2(a, b) {
    A2 = false;
    B2 && (B2 = false, E2(L2), L2 = -1);
    z2 = true;
    var c = y2;
    try {
      G2(b);
      for (v2 = h(r2); null !== v2 && (!(v2.expirationTime > b) || a && !M2()); ) {
        var d = v2.callback;
        if ("function" === typeof d) {
          v2.callback = null;
          y2 = v2.priorityLevel;
          var e = d(v2.expirationTime <= b);
          b = exports.unstable_now();
          "function" === typeof e ? v2.callback = e : v2 === h(r2) && k2(r2);
          G2(b);
        } else k2(r2);
        v2 = h(r2);
      }
      if (null !== v2) var w2 = true;
      else {
        var m2 = h(t2);
        null !== m2 && K2(H2, m2.startTime - b);
        w2 = false;
      }
      return w2;
    } finally {
      v2 = null, y2 = c, z2 = false;
    }
  }
  var N2 = false, O2 = null, L2 = -1, P2 = 5, Q2 = -1;
  function M2() {
    return exports.unstable_now() - Q2 < P2 ? false : true;
  }
  function R2() {
    if (null !== O2) {
      var a = exports.unstable_now();
      Q2 = a;
      var b = true;
      try {
        b = O2(true, a);
      } finally {
        b ? S2() : (N2 = false, O2 = null);
      }
    } else N2 = false;
  }
  var S2;
  if ("function" === typeof F2) S2 = function() {
    F2(R2);
  };
  else if ("undefined" !== typeof MessageChannel) {
    var T2 = new MessageChannel(), U2 = T2.port2;
    T2.port1.onmessage = R2;
    S2 = function() {
      U2.postMessage(null);
    };
  } else S2 = function() {
    D2(R2, 0);
  };
  function I2(a) {
    O2 = a;
    N2 || (N2 = true, S2());
  }
  function K2(a, b) {
    L2 = D2(function() {
      a(exports.unstable_now());
    }, b);
  }
  exports.unstable_IdlePriority = 5;
  exports.unstable_ImmediatePriority = 1;
  exports.unstable_LowPriority = 4;
  exports.unstable_NormalPriority = 3;
  exports.unstable_Profiling = null;
  exports.unstable_UserBlockingPriority = 2;
  exports.unstable_cancelCallback = function(a) {
    a.callback = null;
  };
  exports.unstable_continueExecution = function() {
    A2 || z2 || (A2 = true, I2(J2));
  };
  exports.unstable_forceFrameRate = function(a) {
    0 > a || 125 < a ? console.error("forceFrameRate takes a positive int between 0 and 125, forcing frame rates higher than 125 fps is not supported") : P2 = 0 < a ? Math.floor(1e3 / a) : 5;
  };
  exports.unstable_getCurrentPriorityLevel = function() {
    return y2;
  };
  exports.unstable_getFirstCallbackNode = function() {
    return h(r2);
  };
  exports.unstable_next = function(a) {
    switch (y2) {
      case 1:
      case 2:
      case 3:
        var b = 3;
        break;
      default:
        b = y2;
    }
    var c = y2;
    y2 = b;
    try {
      return a();
    } finally {
      y2 = c;
    }
  };
  exports.unstable_pauseExecution = function() {
  };
  exports.unstable_requestPaint = function() {
  };
  exports.unstable_runWithPriority = function(a, b) {
    switch (a) {
      case 1:
      case 2:
      case 3:
      case 4:
      case 5:
        break;
      default:
        a = 3;
    }
    var c = y2;
    y2 = a;
    try {
      return b();
    } finally {
      y2 = c;
    }
  };
  exports.unstable_scheduleCallback = function(a, b, c) {
    var d = exports.unstable_now();
    "object" === typeof c && null !== c ? (c = c.delay, c = "number" === typeof c && 0 < c ? d + c : d) : c = d;
    switch (a) {
      case 1:
        var e = -1;
        break;
      case 2:
        e = 250;
        break;
      case 5:
        e = 1073741823;
        break;
      case 4:
        e = 1e4;
        break;
      default:
        e = 5e3;
    }
    e = c + e;
    a = { id: u2++, callback: b, priorityLevel: a, startTime: c, expirationTime: e, sortIndex: -1 };
    c > d ? (a.sortIndex = c, f2(t2, a), null === h(r2) && a === h(t2) && (B2 ? (E2(L2), L2 = -1) : B2 = true, K2(H2, c - d))) : (a.sortIndex = e, f2(r2, a), A2 || z2 || (A2 = true, I2(J2)));
    return a;
  };
  exports.unstable_shouldYield = M2;
  exports.unstable_wrapCallback = function(a) {
    var b = y2;
    return function() {
      var c = y2;
      y2 = b;
      try {
        return a.apply(this, arguments);
      } finally {
        y2 = c;
      }
    };
  };
})(scheduler_production_min);
{
  scheduler.exports = scheduler_production_min;
}
var schedulerExports = scheduler.exports;
/**
 * @license React
 * react-dom.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
var aa = reactExports, ca = schedulerExports;
function p(a) {
  for (var b = "https://reactjs.org/docs/error-decoder.html?invariant=" + a, c = 1; c < arguments.length; c++) b += "&args[]=" + encodeURIComponent(arguments[c]);
  return "Minified React error #" + a + "; visit " + b + " for the full message or use the non-minified dev environment for full errors and additional helpful warnings.";
}
var da = /* @__PURE__ */ new Set(), ea = {};
function fa(a, b) {
  ha(a, b);
  ha(a + "Capture", b);
}
function ha(a, b) {
  ea[a] = b;
  for (a = 0; a < b.length; a++) da.add(b[a]);
}
var ia = !("undefined" === typeof window || "undefined" === typeof window.document || "undefined" === typeof window.document.createElement), ja = Object.prototype.hasOwnProperty, ka = /^[:A-Z_a-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD][:A-Z_a-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD\-.0-9\u00B7\u0300-\u036F\u203F-\u2040]*$/, la = {}, ma = {};
function oa(a) {
  if (ja.call(ma, a)) return true;
  if (ja.call(la, a)) return false;
  if (ka.test(a)) return ma[a] = true;
  la[a] = true;
  return false;
}
function pa(a, b, c, d) {
  if (null !== c && 0 === c.type) return false;
  switch (typeof b) {
    case "function":
    case "symbol":
      return true;
    case "boolean":
      if (d) return false;
      if (null !== c) return !c.acceptsBooleans;
      a = a.toLowerCase().slice(0, 5);
      return "data-" !== a && "aria-" !== a;
    default:
      return false;
  }
}
function qa(a, b, c, d) {
  if (null === b || "undefined" === typeof b || pa(a, b, c, d)) return true;
  if (d) return false;
  if (null !== c) switch (c.type) {
    case 3:
      return !b;
    case 4:
      return false === b;
    case 5:
      return isNaN(b);
    case 6:
      return isNaN(b) || 1 > b;
  }
  return false;
}
function v(a, b, c, d, e, f2, g) {
  this.acceptsBooleans = 2 === b || 3 === b || 4 === b;
  this.attributeName = d;
  this.attributeNamespace = e;
  this.mustUseProperty = c;
  this.propertyName = a;
  this.type = b;
  this.sanitizeURL = f2;
  this.removeEmptyString = g;
}
var z = {};
"children dangerouslySetInnerHTML defaultValue defaultChecked innerHTML suppressContentEditableWarning suppressHydrationWarning style".split(" ").forEach(function(a) {
  z[a] = new v(a, 0, false, a, null, false, false);
});
[["acceptCharset", "accept-charset"], ["className", "class"], ["htmlFor", "for"], ["httpEquiv", "http-equiv"]].forEach(function(a) {
  var b = a[0];
  z[b] = new v(b, 1, false, a[1], null, false, false);
});
["contentEditable", "draggable", "spellCheck", "value"].forEach(function(a) {
  z[a] = new v(a, 2, false, a.toLowerCase(), null, false, false);
});
["autoReverse", "externalResourcesRequired", "focusable", "preserveAlpha"].forEach(function(a) {
  z[a] = new v(a, 2, false, a, null, false, false);
});
"allowFullScreen async autoFocus autoPlay controls default defer disabled disablePictureInPicture disableRemotePlayback formNoValidate hidden loop noModule noValidate open playsInline readOnly required reversed scoped seamless itemScope".split(" ").forEach(function(a) {
  z[a] = new v(a, 3, false, a.toLowerCase(), null, false, false);
});
["checked", "multiple", "muted", "selected"].forEach(function(a) {
  z[a] = new v(a, 3, true, a, null, false, false);
});
["capture", "download"].forEach(function(a) {
  z[a] = new v(a, 4, false, a, null, false, false);
});
["cols", "rows", "size", "span"].forEach(function(a) {
  z[a] = new v(a, 6, false, a, null, false, false);
});
["rowSpan", "start"].forEach(function(a) {
  z[a] = new v(a, 5, false, a.toLowerCase(), null, false, false);
});
var ra = /[\-:]([a-z])/g;
function sa(a) {
  return a[1].toUpperCase();
}
"accent-height alignment-baseline arabic-form baseline-shift cap-height clip-path clip-rule color-interpolation color-interpolation-filters color-profile color-rendering dominant-baseline enable-background fill-opacity fill-rule flood-color flood-opacity font-family font-size font-size-adjust font-stretch font-style font-variant font-weight glyph-name glyph-orientation-horizontal glyph-orientation-vertical horiz-adv-x horiz-origin-x image-rendering letter-spacing lighting-color marker-end marker-mid marker-start overline-position overline-thickness paint-order panose-1 pointer-events rendering-intent shape-rendering stop-color stop-opacity strikethrough-position strikethrough-thickness stroke-dasharray stroke-dashoffset stroke-linecap stroke-linejoin stroke-miterlimit stroke-opacity stroke-width text-anchor text-decoration text-rendering underline-position underline-thickness unicode-bidi unicode-range units-per-em v-alphabetic v-hanging v-ideographic v-mathematical vector-effect vert-adv-y vert-origin-x vert-origin-y word-spacing writing-mode xmlns:xlink x-height".split(" ").forEach(function(a) {
  var b = a.replace(
    ra,
    sa
  );
  z[b] = new v(b, 1, false, a, null, false, false);
});
"xlink:actuate xlink:arcrole xlink:role xlink:show xlink:title xlink:type".split(" ").forEach(function(a) {
  var b = a.replace(ra, sa);
  z[b] = new v(b, 1, false, a, "http://www.w3.org/1999/xlink", false, false);
});
["xml:base", "xml:lang", "xml:space"].forEach(function(a) {
  var b = a.replace(ra, sa);
  z[b] = new v(b, 1, false, a, "http://www.w3.org/XML/1998/namespace", false, false);
});
["tabIndex", "crossOrigin"].forEach(function(a) {
  z[a] = new v(a, 1, false, a.toLowerCase(), null, false, false);
});
z.xlinkHref = new v("xlinkHref", 1, false, "xlink:href", "http://www.w3.org/1999/xlink", true, false);
["src", "href", "action", "formAction"].forEach(function(a) {
  z[a] = new v(a, 1, false, a.toLowerCase(), null, true, true);
});
function ta(a, b, c, d) {
  var e = z.hasOwnProperty(b) ? z[b] : null;
  if (null !== e ? 0 !== e.type : d || !(2 < b.length) || "o" !== b[0] && "O" !== b[0] || "n" !== b[1] && "N" !== b[1]) qa(b, c, e, d) && (c = null), d || null === e ? oa(b) && (null === c ? a.removeAttribute(b) : a.setAttribute(b, "" + c)) : e.mustUseProperty ? a[e.propertyName] = null === c ? 3 === e.type ? false : "" : c : (b = e.attributeName, d = e.attributeNamespace, null === c ? a.removeAttribute(b) : (e = e.type, c = 3 === e || 4 === e && true === c ? "" : "" + c, d ? a.setAttributeNS(d, b, c) : a.setAttribute(b, c)));
}
var ua = aa.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED, va = Symbol.for("react.element"), wa = Symbol.for("react.portal"), ya = Symbol.for("react.fragment"), za = Symbol.for("react.strict_mode"), Aa = Symbol.for("react.profiler"), Ba = Symbol.for("react.provider"), Ca = Symbol.for("react.context"), Da = Symbol.for("react.forward_ref"), Ea = Symbol.for("react.suspense"), Fa = Symbol.for("react.suspense_list"), Ga = Symbol.for("react.memo"), Ha = Symbol.for("react.lazy");
var Ia = Symbol.for("react.offscreen");
var Ja = Symbol.iterator;
function Ka(a) {
  if (null === a || "object" !== typeof a) return null;
  a = Ja && a[Ja] || a["@@iterator"];
  return "function" === typeof a ? a : null;
}
var A = Object.assign, La;
function Ma(a) {
  if (void 0 === La) try {
    throw Error();
  } catch (c) {
    var b = c.stack.trim().match(/\n( *(at )?)/);
    La = b && b[1] || "";
  }
  return "\n" + La + a;
}
var Na = false;
function Oa(a, b) {
  if (!a || Na) return "";
  Na = true;
  var c = Error.prepareStackTrace;
  Error.prepareStackTrace = void 0;
  try {
    if (b) if (b = function() {
      throw Error();
    }, Object.defineProperty(b.prototype, "props", { set: function() {
      throw Error();
    } }), "object" === typeof Reflect && Reflect.construct) {
      try {
        Reflect.construct(b, []);
      } catch (l2) {
        var d = l2;
      }
      Reflect.construct(a, [], b);
    } else {
      try {
        b.call();
      } catch (l2) {
        d = l2;
      }
      a.call(b.prototype);
    }
    else {
      try {
        throw Error();
      } catch (l2) {
        d = l2;
      }
      a();
    }
  } catch (l2) {
    if (l2 && d && "string" === typeof l2.stack) {
      for (var e = l2.stack.split("\n"), f2 = d.stack.split("\n"), g = e.length - 1, h = f2.length - 1; 1 <= g && 0 <= h && e[g] !== f2[h]; ) h--;
      for (; 1 <= g && 0 <= h; g--, h--) if (e[g] !== f2[h]) {
        if (1 !== g || 1 !== h) {
          do
            if (g--, h--, 0 > h || e[g] !== f2[h]) {
              var k2 = "\n" + e[g].replace(" at new ", " at ");
              a.displayName && k2.includes("<anonymous>") && (k2 = k2.replace("<anonymous>", a.displayName));
              return k2;
            }
          while (1 <= g && 0 <= h);
        }
        break;
      }
    }
  } finally {
    Na = false, Error.prepareStackTrace = c;
  }
  return (a = a ? a.displayName || a.name : "") ? Ma(a) : "";
}
function Pa(a) {
  switch (a.tag) {
    case 5:
      return Ma(a.type);
    case 16:
      return Ma("Lazy");
    case 13:
      return Ma("Suspense");
    case 19:
      return Ma("SuspenseList");
    case 0:
    case 2:
    case 15:
      return a = Oa(a.type, false), a;
    case 11:
      return a = Oa(a.type.render, false), a;
    case 1:
      return a = Oa(a.type, true), a;
    default:
      return "";
  }
}
function Qa(a) {
  if (null == a) return null;
  if ("function" === typeof a) return a.displayName || a.name || null;
  if ("string" === typeof a) return a;
  switch (a) {
    case ya:
      return "Fragment";
    case wa:
      return "Portal";
    case Aa:
      return "Profiler";
    case za:
      return "StrictMode";
    case Ea:
      return "Suspense";
    case Fa:
      return "SuspenseList";
  }
  if ("object" === typeof a) switch (a.$$typeof) {
    case Ca:
      return (a.displayName || "Context") + ".Consumer";
    case Ba:
      return (a._context.displayName || "Context") + ".Provider";
    case Da:
      var b = a.render;
      a = a.displayName;
      a || (a = b.displayName || b.name || "", a = "" !== a ? "ForwardRef(" + a + ")" : "ForwardRef");
      return a;
    case Ga:
      return b = a.displayName || null, null !== b ? b : Qa(a.type) || "Memo";
    case Ha:
      b = a._payload;
      a = a._init;
      try {
        return Qa(a(b));
      } catch (c) {
      }
  }
  return null;
}
function Ra(a) {
  var b = a.type;
  switch (a.tag) {
    case 24:
      return "Cache";
    case 9:
      return (b.displayName || "Context") + ".Consumer";
    case 10:
      return (b._context.displayName || "Context") + ".Provider";
    case 18:
      return "DehydratedFragment";
    case 11:
      return a = b.render, a = a.displayName || a.name || "", b.displayName || ("" !== a ? "ForwardRef(" + a + ")" : "ForwardRef");
    case 7:
      return "Fragment";
    case 5:
      return b;
    case 4:
      return "Portal";
    case 3:
      return "Root";
    case 6:
      return "Text";
    case 16:
      return Qa(b);
    case 8:
      return b === za ? "StrictMode" : "Mode";
    case 22:
      return "Offscreen";
    case 12:
      return "Profiler";
    case 21:
      return "Scope";
    case 13:
      return "Suspense";
    case 19:
      return "SuspenseList";
    case 25:
      return "TracingMarker";
    case 1:
    case 0:
    case 17:
    case 2:
    case 14:
    case 15:
      if ("function" === typeof b) return b.displayName || b.name || null;
      if ("string" === typeof b) return b;
  }
  return null;
}
function Sa(a) {
  switch (typeof a) {
    case "boolean":
    case "number":
    case "string":
    case "undefined":
      return a;
    case "object":
      return a;
    default:
      return "";
  }
}
function Ta(a) {
  var b = a.type;
  return (a = a.nodeName) && "input" === a.toLowerCase() && ("checkbox" === b || "radio" === b);
}
function Ua(a) {
  var b = Ta(a) ? "checked" : "value", c = Object.getOwnPropertyDescriptor(a.constructor.prototype, b), d = "" + a[b];
  if (!a.hasOwnProperty(b) && "undefined" !== typeof c && "function" === typeof c.get && "function" === typeof c.set) {
    var e = c.get, f2 = c.set;
    Object.defineProperty(a, b, { configurable: true, get: function() {
      return e.call(this);
    }, set: function(a2) {
      d = "" + a2;
      f2.call(this, a2);
    } });
    Object.defineProperty(a, b, { enumerable: c.enumerable });
    return { getValue: function() {
      return d;
    }, setValue: function(a2) {
      d = "" + a2;
    }, stopTracking: function() {
      a._valueTracker = null;
      delete a[b];
    } };
  }
}
function Va(a) {
  a._valueTracker || (a._valueTracker = Ua(a));
}
function Wa(a) {
  if (!a) return false;
  var b = a._valueTracker;
  if (!b) return true;
  var c = b.getValue();
  var d = "";
  a && (d = Ta(a) ? a.checked ? "true" : "false" : a.value);
  a = d;
  return a !== c ? (b.setValue(a), true) : false;
}
function Xa(a) {
  a = a || ("undefined" !== typeof document ? document : void 0);
  if ("undefined" === typeof a) return null;
  try {
    return a.activeElement || a.body;
  } catch (b) {
    return a.body;
  }
}
function Ya(a, b) {
  var c = b.checked;
  return A({}, b, { defaultChecked: void 0, defaultValue: void 0, value: void 0, checked: null != c ? c : a._wrapperState.initialChecked });
}
function Za(a, b) {
  var c = null == b.defaultValue ? "" : b.defaultValue, d = null != b.checked ? b.checked : b.defaultChecked;
  c = Sa(null != b.value ? b.value : c);
  a._wrapperState = { initialChecked: d, initialValue: c, controlled: "checkbox" === b.type || "radio" === b.type ? null != b.checked : null != b.value };
}
function ab(a, b) {
  b = b.checked;
  null != b && ta(a, "checked", b, false);
}
function bb(a, b) {
  ab(a, b);
  var c = Sa(b.value), d = b.type;
  if (null != c) if ("number" === d) {
    if (0 === c && "" === a.value || a.value != c) a.value = "" + c;
  } else a.value !== "" + c && (a.value = "" + c);
  else if ("submit" === d || "reset" === d) {
    a.removeAttribute("value");
    return;
  }
  b.hasOwnProperty("value") ? cb(a, b.type, c) : b.hasOwnProperty("defaultValue") && cb(a, b.type, Sa(b.defaultValue));
  null == b.checked && null != b.defaultChecked && (a.defaultChecked = !!b.defaultChecked);
}
function db(a, b, c) {
  if (b.hasOwnProperty("value") || b.hasOwnProperty("defaultValue")) {
    var d = b.type;
    if (!("submit" !== d && "reset" !== d || void 0 !== b.value && null !== b.value)) return;
    b = "" + a._wrapperState.initialValue;
    c || b === a.value || (a.value = b);
    a.defaultValue = b;
  }
  c = a.name;
  "" !== c && (a.name = "");
  a.defaultChecked = !!a._wrapperState.initialChecked;
  "" !== c && (a.name = c);
}
function cb(a, b, c) {
  if ("number" !== b || Xa(a.ownerDocument) !== a) null == c ? a.defaultValue = "" + a._wrapperState.initialValue : a.defaultValue !== "" + c && (a.defaultValue = "" + c);
}
var eb = Array.isArray;
function fb(a, b, c, d) {
  a = a.options;
  if (b) {
    b = {};
    for (var e = 0; e < c.length; e++) b["$" + c[e]] = true;
    for (c = 0; c < a.length; c++) e = b.hasOwnProperty("$" + a[c].value), a[c].selected !== e && (a[c].selected = e), e && d && (a[c].defaultSelected = true);
  } else {
    c = "" + Sa(c);
    b = null;
    for (e = 0; e < a.length; e++) {
      if (a[e].value === c) {
        a[e].selected = true;
        d && (a[e].defaultSelected = true);
        return;
      }
      null !== b || a[e].disabled || (b = a[e]);
    }
    null !== b && (b.selected = true);
  }
}
function gb(a, b) {
  if (null != b.dangerouslySetInnerHTML) throw Error(p(91));
  return A({}, b, { value: void 0, defaultValue: void 0, children: "" + a._wrapperState.initialValue });
}
function hb(a, b) {
  var c = b.value;
  if (null == c) {
    c = b.children;
    b = b.defaultValue;
    if (null != c) {
      if (null != b) throw Error(p(92));
      if (eb(c)) {
        if (1 < c.length) throw Error(p(93));
        c = c[0];
      }
      b = c;
    }
    null == b && (b = "");
    c = b;
  }
  a._wrapperState = { initialValue: Sa(c) };
}
function ib(a, b) {
  var c = Sa(b.value), d = Sa(b.defaultValue);
  null != c && (c = "" + c, c !== a.value && (a.value = c), null == b.defaultValue && a.defaultValue !== c && (a.defaultValue = c));
  null != d && (a.defaultValue = "" + d);
}
function jb(a) {
  var b = a.textContent;
  b === a._wrapperState.initialValue && "" !== b && null !== b && (a.value = b);
}
function kb(a) {
  switch (a) {
    case "svg":
      return "http://www.w3.org/2000/svg";
    case "math":
      return "http://www.w3.org/1998/Math/MathML";
    default:
      return "http://www.w3.org/1999/xhtml";
  }
}
function lb(a, b) {
  return null == a || "http://www.w3.org/1999/xhtml" === a ? kb(b) : "http://www.w3.org/2000/svg" === a && "foreignObject" === b ? "http://www.w3.org/1999/xhtml" : a;
}
var mb, nb = function(a) {
  return "undefined" !== typeof MSApp && MSApp.execUnsafeLocalFunction ? function(b, c, d, e) {
    MSApp.execUnsafeLocalFunction(function() {
      return a(b, c, d, e);
    });
  } : a;
}(function(a, b) {
  if ("http://www.w3.org/2000/svg" !== a.namespaceURI || "innerHTML" in a) a.innerHTML = b;
  else {
    mb = mb || document.createElement("div");
    mb.innerHTML = "<svg>" + b.valueOf().toString() + "</svg>";
    for (b = mb.firstChild; a.firstChild; ) a.removeChild(a.firstChild);
    for (; b.firstChild; ) a.appendChild(b.firstChild);
  }
});
function ob(a, b) {
  if (b) {
    var c = a.firstChild;
    if (c && c === a.lastChild && 3 === c.nodeType) {
      c.nodeValue = b;
      return;
    }
  }
  a.textContent = b;
}
var pb = {
  animationIterationCount: true,
  aspectRatio: true,
  borderImageOutset: true,
  borderImageSlice: true,
  borderImageWidth: true,
  boxFlex: true,
  boxFlexGroup: true,
  boxOrdinalGroup: true,
  columnCount: true,
  columns: true,
  flex: true,
  flexGrow: true,
  flexPositive: true,
  flexShrink: true,
  flexNegative: true,
  flexOrder: true,
  gridArea: true,
  gridRow: true,
  gridRowEnd: true,
  gridRowSpan: true,
  gridRowStart: true,
  gridColumn: true,
  gridColumnEnd: true,
  gridColumnSpan: true,
  gridColumnStart: true,
  fontWeight: true,
  lineClamp: true,
  lineHeight: true,
  opacity: true,
  order: true,
  orphans: true,
  tabSize: true,
  widows: true,
  zIndex: true,
  zoom: true,
  fillOpacity: true,
  floodOpacity: true,
  stopOpacity: true,
  strokeDasharray: true,
  strokeDashoffset: true,
  strokeMiterlimit: true,
  strokeOpacity: true,
  strokeWidth: true
}, qb = ["Webkit", "ms", "Moz", "O"];
Object.keys(pb).forEach(function(a) {
  qb.forEach(function(b) {
    b = b + a.charAt(0).toUpperCase() + a.substring(1);
    pb[b] = pb[a];
  });
});
function rb(a, b, c) {
  return null == b || "boolean" === typeof b || "" === b ? "" : c || "number" !== typeof b || 0 === b || pb.hasOwnProperty(a) && pb[a] ? ("" + b).trim() : b + "px";
}
function sb(a, b) {
  a = a.style;
  for (var c in b) if (b.hasOwnProperty(c)) {
    var d = 0 === c.indexOf("--"), e = rb(c, b[c], d);
    "float" === c && (c = "cssFloat");
    d ? a.setProperty(c, e) : a[c] = e;
  }
}
var tb = A({ menuitem: true }, { area: true, base: true, br: true, col: true, embed: true, hr: true, img: true, input: true, keygen: true, link: true, meta: true, param: true, source: true, track: true, wbr: true });
function ub(a, b) {
  if (b) {
    if (tb[a] && (null != b.children || null != b.dangerouslySetInnerHTML)) throw Error(p(137, a));
    if (null != b.dangerouslySetInnerHTML) {
      if (null != b.children) throw Error(p(60));
      if ("object" !== typeof b.dangerouslySetInnerHTML || !("__html" in b.dangerouslySetInnerHTML)) throw Error(p(61));
    }
    if (null != b.style && "object" !== typeof b.style) throw Error(p(62));
  }
}
function vb(a, b) {
  if (-1 === a.indexOf("-")) return "string" === typeof b.is;
  switch (a) {
    case "annotation-xml":
    case "color-profile":
    case "font-face":
    case "font-face-src":
    case "font-face-uri":
    case "font-face-format":
    case "font-face-name":
    case "missing-glyph":
      return false;
    default:
      return true;
  }
}
var wb = null;
function xb(a) {
  a = a.target || a.srcElement || window;
  a.correspondingUseElement && (a = a.correspondingUseElement);
  return 3 === a.nodeType ? a.parentNode : a;
}
var yb = null, zb = null, Ab = null;
function Bb(a) {
  if (a = Cb(a)) {
    if ("function" !== typeof yb) throw Error(p(280));
    var b = a.stateNode;
    b && (b = Db(b), yb(a.stateNode, a.type, b));
  }
}
function Eb(a) {
  zb ? Ab ? Ab.push(a) : Ab = [a] : zb = a;
}
function Fb() {
  if (zb) {
    var a = zb, b = Ab;
    Ab = zb = null;
    Bb(a);
    if (b) for (a = 0; a < b.length; a++) Bb(b[a]);
  }
}
function Gb(a, b) {
  return a(b);
}
function Hb() {
}
var Ib = false;
function Jb(a, b, c) {
  if (Ib) return a(b, c);
  Ib = true;
  try {
    return Gb(a, b, c);
  } finally {
    if (Ib = false, null !== zb || null !== Ab) Hb(), Fb();
  }
}
function Kb(a, b) {
  var c = a.stateNode;
  if (null === c) return null;
  var d = Db(c);
  if (null === d) return null;
  c = d[b];
  a: switch (b) {
    case "onClick":
    case "onClickCapture":
    case "onDoubleClick":
    case "onDoubleClickCapture":
    case "onMouseDown":
    case "onMouseDownCapture":
    case "onMouseMove":
    case "onMouseMoveCapture":
    case "onMouseUp":
    case "onMouseUpCapture":
    case "onMouseEnter":
      (d = !d.disabled) || (a = a.type, d = !("button" === a || "input" === a || "select" === a || "textarea" === a));
      a = !d;
      break a;
    default:
      a = false;
  }
  if (a) return null;
  if (c && "function" !== typeof c) throw Error(p(231, b, typeof c));
  return c;
}
var Lb = false;
if (ia) try {
  var Mb = {};
  Object.defineProperty(Mb, "passive", { get: function() {
    Lb = true;
  } });
  window.addEventListener("test", Mb, Mb);
  window.removeEventListener("test", Mb, Mb);
} catch (a) {
  Lb = false;
}
function Nb(a, b, c, d, e, f2, g, h, k2) {
  var l2 = Array.prototype.slice.call(arguments, 3);
  try {
    b.apply(c, l2);
  } catch (m2) {
    this.onError(m2);
  }
}
var Ob = false, Pb = null, Qb = false, Rb = null, Sb = { onError: function(a) {
  Ob = true;
  Pb = a;
} };
function Tb(a, b, c, d, e, f2, g, h, k2) {
  Ob = false;
  Pb = null;
  Nb.apply(Sb, arguments);
}
function Ub(a, b, c, d, e, f2, g, h, k2) {
  Tb.apply(this, arguments);
  if (Ob) {
    if (Ob) {
      var l2 = Pb;
      Ob = false;
      Pb = null;
    } else throw Error(p(198));
    Qb || (Qb = true, Rb = l2);
  }
}
function Vb(a) {
  var b = a, c = a;
  if (a.alternate) for (; b.return; ) b = b.return;
  else {
    a = b;
    do
      b = a, 0 !== (b.flags & 4098) && (c = b.return), a = b.return;
    while (a);
  }
  return 3 === b.tag ? c : null;
}
function Wb(a) {
  if (13 === a.tag) {
    var b = a.memoizedState;
    null === b && (a = a.alternate, null !== a && (b = a.memoizedState));
    if (null !== b) return b.dehydrated;
  }
  return null;
}
function Xb(a) {
  if (Vb(a) !== a) throw Error(p(188));
}
function Yb(a) {
  var b = a.alternate;
  if (!b) {
    b = Vb(a);
    if (null === b) throw Error(p(188));
    return b !== a ? null : a;
  }
  for (var c = a, d = b; ; ) {
    var e = c.return;
    if (null === e) break;
    var f2 = e.alternate;
    if (null === f2) {
      d = e.return;
      if (null !== d) {
        c = d;
        continue;
      }
      break;
    }
    if (e.child === f2.child) {
      for (f2 = e.child; f2; ) {
        if (f2 === c) return Xb(e), a;
        if (f2 === d) return Xb(e), b;
        f2 = f2.sibling;
      }
      throw Error(p(188));
    }
    if (c.return !== d.return) c = e, d = f2;
    else {
      for (var g = false, h = e.child; h; ) {
        if (h === c) {
          g = true;
          c = e;
          d = f2;
          break;
        }
        if (h === d) {
          g = true;
          d = e;
          c = f2;
          break;
        }
        h = h.sibling;
      }
      if (!g) {
        for (h = f2.child; h; ) {
          if (h === c) {
            g = true;
            c = f2;
            d = e;
            break;
          }
          if (h === d) {
            g = true;
            d = f2;
            c = e;
            break;
          }
          h = h.sibling;
        }
        if (!g) throw Error(p(189));
      }
    }
    if (c.alternate !== d) throw Error(p(190));
  }
  if (3 !== c.tag) throw Error(p(188));
  return c.stateNode.current === c ? a : b;
}
function Zb(a) {
  a = Yb(a);
  return null !== a ? $b(a) : null;
}
function $b(a) {
  if (5 === a.tag || 6 === a.tag) return a;
  for (a = a.child; null !== a; ) {
    var b = $b(a);
    if (null !== b) return b;
    a = a.sibling;
  }
  return null;
}
var ac = ca.unstable_scheduleCallback, bc = ca.unstable_cancelCallback, cc = ca.unstable_shouldYield, dc = ca.unstable_requestPaint, B = ca.unstable_now, ec = ca.unstable_getCurrentPriorityLevel, fc = ca.unstable_ImmediatePriority, gc = ca.unstable_UserBlockingPriority, hc = ca.unstable_NormalPriority, ic = ca.unstable_LowPriority, jc = ca.unstable_IdlePriority, kc = null, lc = null;
function mc(a) {
  if (lc && "function" === typeof lc.onCommitFiberRoot) try {
    lc.onCommitFiberRoot(kc, a, void 0, 128 === (a.current.flags & 128));
  } catch (b) {
  }
}
var oc = Math.clz32 ? Math.clz32 : nc, pc = Math.log, qc = Math.LN2;
function nc(a) {
  a >>>= 0;
  return 0 === a ? 32 : 31 - (pc(a) / qc | 0) | 0;
}
var rc = 64, sc = 4194304;
function tc(a) {
  switch (a & -a) {
    case 1:
      return 1;
    case 2:
      return 2;
    case 4:
      return 4;
    case 8:
      return 8;
    case 16:
      return 16;
    case 32:
      return 32;
    case 64:
    case 128:
    case 256:
    case 512:
    case 1024:
    case 2048:
    case 4096:
    case 8192:
    case 16384:
    case 32768:
    case 65536:
    case 131072:
    case 262144:
    case 524288:
    case 1048576:
    case 2097152:
      return a & 4194240;
    case 4194304:
    case 8388608:
    case 16777216:
    case 33554432:
    case 67108864:
      return a & 130023424;
    case 134217728:
      return 134217728;
    case 268435456:
      return 268435456;
    case 536870912:
      return 536870912;
    case 1073741824:
      return 1073741824;
    default:
      return a;
  }
}
function uc(a, b) {
  var c = a.pendingLanes;
  if (0 === c) return 0;
  var d = 0, e = a.suspendedLanes, f2 = a.pingedLanes, g = c & 268435455;
  if (0 !== g) {
    var h = g & ~e;
    0 !== h ? d = tc(h) : (f2 &= g, 0 !== f2 && (d = tc(f2)));
  } else g = c & ~e, 0 !== g ? d = tc(g) : 0 !== f2 && (d = tc(f2));
  if (0 === d) return 0;
  if (0 !== b && b !== d && 0 === (b & e) && (e = d & -d, f2 = b & -b, e >= f2 || 16 === e && 0 !== (f2 & 4194240))) return b;
  0 !== (d & 4) && (d |= c & 16);
  b = a.entangledLanes;
  if (0 !== b) for (a = a.entanglements, b &= d; 0 < b; ) c = 31 - oc(b), e = 1 << c, d |= a[c], b &= ~e;
  return d;
}
function vc(a, b) {
  switch (a) {
    case 1:
    case 2:
    case 4:
      return b + 250;
    case 8:
    case 16:
    case 32:
    case 64:
    case 128:
    case 256:
    case 512:
    case 1024:
    case 2048:
    case 4096:
    case 8192:
    case 16384:
    case 32768:
    case 65536:
    case 131072:
    case 262144:
    case 524288:
    case 1048576:
    case 2097152:
      return b + 5e3;
    case 4194304:
    case 8388608:
    case 16777216:
    case 33554432:
    case 67108864:
      return -1;
    case 134217728:
    case 268435456:
    case 536870912:
    case 1073741824:
      return -1;
    default:
      return -1;
  }
}
function wc(a, b) {
  for (var c = a.suspendedLanes, d = a.pingedLanes, e = a.expirationTimes, f2 = a.pendingLanes; 0 < f2; ) {
    var g = 31 - oc(f2), h = 1 << g, k2 = e[g];
    if (-1 === k2) {
      if (0 === (h & c) || 0 !== (h & d)) e[g] = vc(h, b);
    } else k2 <= b && (a.expiredLanes |= h);
    f2 &= ~h;
  }
}
function xc(a) {
  a = a.pendingLanes & -1073741825;
  return 0 !== a ? a : a & 1073741824 ? 1073741824 : 0;
}
function yc() {
  var a = rc;
  rc <<= 1;
  0 === (rc & 4194240) && (rc = 64);
  return a;
}
function zc(a) {
  for (var b = [], c = 0; 31 > c; c++) b.push(a);
  return b;
}
function Ac(a, b, c) {
  a.pendingLanes |= b;
  536870912 !== b && (a.suspendedLanes = 0, a.pingedLanes = 0);
  a = a.eventTimes;
  b = 31 - oc(b);
  a[b] = c;
}
function Bc(a, b) {
  var c = a.pendingLanes & ~b;
  a.pendingLanes = b;
  a.suspendedLanes = 0;
  a.pingedLanes = 0;
  a.expiredLanes &= b;
  a.mutableReadLanes &= b;
  a.entangledLanes &= b;
  b = a.entanglements;
  var d = a.eventTimes;
  for (a = a.expirationTimes; 0 < c; ) {
    var e = 31 - oc(c), f2 = 1 << e;
    b[e] = 0;
    d[e] = -1;
    a[e] = -1;
    c &= ~f2;
  }
}
function Cc(a, b) {
  var c = a.entangledLanes |= b;
  for (a = a.entanglements; c; ) {
    var d = 31 - oc(c), e = 1 << d;
    e & b | a[d] & b && (a[d] |= b);
    c &= ~e;
  }
}
var C = 0;
function Dc(a) {
  a &= -a;
  return 1 < a ? 4 < a ? 0 !== (a & 268435455) ? 16 : 536870912 : 4 : 1;
}
var Ec, Fc, Gc, Hc, Ic, Jc = false, Kc = [], Lc = null, Mc = null, Nc = null, Oc = /* @__PURE__ */ new Map(), Pc = /* @__PURE__ */ new Map(), Qc = [], Rc = "mousedown mouseup touchcancel touchend touchstart auxclick dblclick pointercancel pointerdown pointerup dragend dragstart drop compositionend compositionstart keydown keypress keyup input textInput copy cut paste click change contextmenu reset submit".split(" ");
function Sc(a, b) {
  switch (a) {
    case "focusin":
    case "focusout":
      Lc = null;
      break;
    case "dragenter":
    case "dragleave":
      Mc = null;
      break;
    case "mouseover":
    case "mouseout":
      Nc = null;
      break;
    case "pointerover":
    case "pointerout":
      Oc.delete(b.pointerId);
      break;
    case "gotpointercapture":
    case "lostpointercapture":
      Pc.delete(b.pointerId);
  }
}
function Tc(a, b, c, d, e, f2) {
  if (null === a || a.nativeEvent !== f2) return a = { blockedOn: b, domEventName: c, eventSystemFlags: d, nativeEvent: f2, targetContainers: [e] }, null !== b && (b = Cb(b), null !== b && Fc(b)), a;
  a.eventSystemFlags |= d;
  b = a.targetContainers;
  null !== e && -1 === b.indexOf(e) && b.push(e);
  return a;
}
function Uc(a, b, c, d, e) {
  switch (b) {
    case "focusin":
      return Lc = Tc(Lc, a, b, c, d, e), true;
    case "dragenter":
      return Mc = Tc(Mc, a, b, c, d, e), true;
    case "mouseover":
      return Nc = Tc(Nc, a, b, c, d, e), true;
    case "pointerover":
      var f2 = e.pointerId;
      Oc.set(f2, Tc(Oc.get(f2) || null, a, b, c, d, e));
      return true;
    case "gotpointercapture":
      return f2 = e.pointerId, Pc.set(f2, Tc(Pc.get(f2) || null, a, b, c, d, e)), true;
  }
  return false;
}
function Vc(a) {
  var b = Wc(a.target);
  if (null !== b) {
    var c = Vb(b);
    if (null !== c) {
      if (b = c.tag, 13 === b) {
        if (b = Wb(c), null !== b) {
          a.blockedOn = b;
          Ic(a.priority, function() {
            Gc(c);
          });
          return;
        }
      } else if (3 === b && c.stateNode.current.memoizedState.isDehydrated) {
        a.blockedOn = 3 === c.tag ? c.stateNode.containerInfo : null;
        return;
      }
    }
  }
  a.blockedOn = null;
}
function Xc(a) {
  if (null !== a.blockedOn) return false;
  for (var b = a.targetContainers; 0 < b.length; ) {
    var c = Yc(a.domEventName, a.eventSystemFlags, b[0], a.nativeEvent);
    if (null === c) {
      c = a.nativeEvent;
      var d = new c.constructor(c.type, c);
      wb = d;
      c.target.dispatchEvent(d);
      wb = null;
    } else return b = Cb(c), null !== b && Fc(b), a.blockedOn = c, false;
    b.shift();
  }
  return true;
}
function Zc(a, b, c) {
  Xc(a) && c.delete(b);
}
function $c() {
  Jc = false;
  null !== Lc && Xc(Lc) && (Lc = null);
  null !== Mc && Xc(Mc) && (Mc = null);
  null !== Nc && Xc(Nc) && (Nc = null);
  Oc.forEach(Zc);
  Pc.forEach(Zc);
}
function ad(a, b) {
  a.blockedOn === b && (a.blockedOn = null, Jc || (Jc = true, ca.unstable_scheduleCallback(ca.unstable_NormalPriority, $c)));
}
function bd(a) {
  function b(b2) {
    return ad(b2, a);
  }
  if (0 < Kc.length) {
    ad(Kc[0], a);
    for (var c = 1; c < Kc.length; c++) {
      var d = Kc[c];
      d.blockedOn === a && (d.blockedOn = null);
    }
  }
  null !== Lc && ad(Lc, a);
  null !== Mc && ad(Mc, a);
  null !== Nc && ad(Nc, a);
  Oc.forEach(b);
  Pc.forEach(b);
  for (c = 0; c < Qc.length; c++) d = Qc[c], d.blockedOn === a && (d.blockedOn = null);
  for (; 0 < Qc.length && (c = Qc[0], null === c.blockedOn); ) Vc(c), null === c.blockedOn && Qc.shift();
}
var cd = ua.ReactCurrentBatchConfig, dd = true;
function ed(a, b, c, d) {
  var e = C, f2 = cd.transition;
  cd.transition = null;
  try {
    C = 1, fd(a, b, c, d);
  } finally {
    C = e, cd.transition = f2;
  }
}
function gd(a, b, c, d) {
  var e = C, f2 = cd.transition;
  cd.transition = null;
  try {
    C = 4, fd(a, b, c, d);
  } finally {
    C = e, cd.transition = f2;
  }
}
function fd(a, b, c, d) {
  if (dd) {
    var e = Yc(a, b, c, d);
    if (null === e) hd(a, b, d, id, c), Sc(a, d);
    else if (Uc(e, a, b, c, d)) d.stopPropagation();
    else if (Sc(a, d), b & 4 && -1 < Rc.indexOf(a)) {
      for (; null !== e; ) {
        var f2 = Cb(e);
        null !== f2 && Ec(f2);
        f2 = Yc(a, b, c, d);
        null === f2 && hd(a, b, d, id, c);
        if (f2 === e) break;
        e = f2;
      }
      null !== e && d.stopPropagation();
    } else hd(a, b, d, null, c);
  }
}
var id = null;
function Yc(a, b, c, d) {
  id = null;
  a = xb(d);
  a = Wc(a);
  if (null !== a) if (b = Vb(a), null === b) a = null;
  else if (c = b.tag, 13 === c) {
    a = Wb(b);
    if (null !== a) return a;
    a = null;
  } else if (3 === c) {
    if (b.stateNode.current.memoizedState.isDehydrated) return 3 === b.tag ? b.stateNode.containerInfo : null;
    a = null;
  } else b !== a && (a = null);
  id = a;
  return null;
}
function jd(a) {
  switch (a) {
    case "cancel":
    case "click":
    case "close":
    case "contextmenu":
    case "copy":
    case "cut":
    case "auxclick":
    case "dblclick":
    case "dragend":
    case "dragstart":
    case "drop":
    case "focusin":
    case "focusout":
    case "input":
    case "invalid":
    case "keydown":
    case "keypress":
    case "keyup":
    case "mousedown":
    case "mouseup":
    case "paste":
    case "pause":
    case "play":
    case "pointercancel":
    case "pointerdown":
    case "pointerup":
    case "ratechange":
    case "reset":
    case "resize":
    case "seeked":
    case "submit":
    case "touchcancel":
    case "touchend":
    case "touchstart":
    case "volumechange":
    case "change":
    case "selectionchange":
    case "textInput":
    case "compositionstart":
    case "compositionend":
    case "compositionupdate":
    case "beforeblur":
    case "afterblur":
    case "beforeinput":
    case "blur":
    case "fullscreenchange":
    case "focus":
    case "hashchange":
    case "popstate":
    case "select":
    case "selectstart":
      return 1;
    case "drag":
    case "dragenter":
    case "dragexit":
    case "dragleave":
    case "dragover":
    case "mousemove":
    case "mouseout":
    case "mouseover":
    case "pointermove":
    case "pointerout":
    case "pointerover":
    case "scroll":
    case "toggle":
    case "touchmove":
    case "wheel":
    case "mouseenter":
    case "mouseleave":
    case "pointerenter":
    case "pointerleave":
      return 4;
    case "message":
      switch (ec()) {
        case fc:
          return 1;
        case gc:
          return 4;
        case hc:
        case ic:
          return 16;
        case jc:
          return 536870912;
        default:
          return 16;
      }
    default:
      return 16;
  }
}
var kd = null, ld = null, md = null;
function nd() {
  if (md) return md;
  var a, b = ld, c = b.length, d, e = "value" in kd ? kd.value : kd.textContent, f2 = e.length;
  for (a = 0; a < c && b[a] === e[a]; a++) ;
  var g = c - a;
  for (d = 1; d <= g && b[c - d] === e[f2 - d]; d++) ;
  return md = e.slice(a, 1 < d ? 1 - d : void 0);
}
function od(a) {
  var b = a.keyCode;
  "charCode" in a ? (a = a.charCode, 0 === a && 13 === b && (a = 13)) : a = b;
  10 === a && (a = 13);
  return 32 <= a || 13 === a ? a : 0;
}
function pd() {
  return true;
}
function qd() {
  return false;
}
function rd(a) {
  function b(b2, d, e, f2, g) {
    this._reactName = b2;
    this._targetInst = e;
    this.type = d;
    this.nativeEvent = f2;
    this.target = g;
    this.currentTarget = null;
    for (var c in a) a.hasOwnProperty(c) && (b2 = a[c], this[c] = b2 ? b2(f2) : f2[c]);
    this.isDefaultPrevented = (null != f2.defaultPrevented ? f2.defaultPrevented : false === f2.returnValue) ? pd : qd;
    this.isPropagationStopped = qd;
    return this;
  }
  A(b.prototype, { preventDefault: function() {
    this.defaultPrevented = true;
    var a2 = this.nativeEvent;
    a2 && (a2.preventDefault ? a2.preventDefault() : "unknown" !== typeof a2.returnValue && (a2.returnValue = false), this.isDefaultPrevented = pd);
  }, stopPropagation: function() {
    var a2 = this.nativeEvent;
    a2 && (a2.stopPropagation ? a2.stopPropagation() : "unknown" !== typeof a2.cancelBubble && (a2.cancelBubble = true), this.isPropagationStopped = pd);
  }, persist: function() {
  }, isPersistent: pd });
  return b;
}
var sd = { eventPhase: 0, bubbles: 0, cancelable: 0, timeStamp: function(a) {
  return a.timeStamp || Date.now();
}, defaultPrevented: 0, isTrusted: 0 }, td = rd(sd), ud = A({}, sd, { view: 0, detail: 0 }), vd = rd(ud), wd, xd, yd, Ad = A({}, ud, { screenX: 0, screenY: 0, clientX: 0, clientY: 0, pageX: 0, pageY: 0, ctrlKey: 0, shiftKey: 0, altKey: 0, metaKey: 0, getModifierState: zd, button: 0, buttons: 0, relatedTarget: function(a) {
  return void 0 === a.relatedTarget ? a.fromElement === a.srcElement ? a.toElement : a.fromElement : a.relatedTarget;
}, movementX: function(a) {
  if ("movementX" in a) return a.movementX;
  a !== yd && (yd && "mousemove" === a.type ? (wd = a.screenX - yd.screenX, xd = a.screenY - yd.screenY) : xd = wd = 0, yd = a);
  return wd;
}, movementY: function(a) {
  return "movementY" in a ? a.movementY : xd;
} }), Bd = rd(Ad), Cd = A({}, Ad, { dataTransfer: 0 }), Dd = rd(Cd), Ed = A({}, ud, { relatedTarget: 0 }), Fd = rd(Ed), Gd = A({}, sd, { animationName: 0, elapsedTime: 0, pseudoElement: 0 }), Hd = rd(Gd), Id = A({}, sd, { clipboardData: function(a) {
  return "clipboardData" in a ? a.clipboardData : window.clipboardData;
} }), Jd = rd(Id), Kd = A({}, sd, { data: 0 }), Ld = rd(Kd), Md = {
  Esc: "Escape",
  Spacebar: " ",
  Left: "ArrowLeft",
  Up: "ArrowUp",
  Right: "ArrowRight",
  Down: "ArrowDown",
  Del: "Delete",
  Win: "OS",
  Menu: "ContextMenu",
  Apps: "ContextMenu",
  Scroll: "ScrollLock",
  MozPrintableKey: "Unidentified"
}, Nd = {
  8: "Backspace",
  9: "Tab",
  12: "Clear",
  13: "Enter",
  16: "Shift",
  17: "Control",
  18: "Alt",
  19: "Pause",
  20: "CapsLock",
  27: "Escape",
  32: " ",
  33: "PageUp",
  34: "PageDown",
  35: "End",
  36: "Home",
  37: "ArrowLeft",
  38: "ArrowUp",
  39: "ArrowRight",
  40: "ArrowDown",
  45: "Insert",
  46: "Delete",
  112: "F1",
  113: "F2",
  114: "F3",
  115: "F4",
  116: "F5",
  117: "F6",
  118: "F7",
  119: "F8",
  120: "F9",
  121: "F10",
  122: "F11",
  123: "F12",
  144: "NumLock",
  145: "ScrollLock",
  224: "Meta"
}, Od = { Alt: "altKey", Control: "ctrlKey", Meta: "metaKey", Shift: "shiftKey" };
function Pd(a) {
  var b = this.nativeEvent;
  return b.getModifierState ? b.getModifierState(a) : (a = Od[a]) ? !!b[a] : false;
}
function zd() {
  return Pd;
}
var Qd = A({}, ud, { key: function(a) {
  if (a.key) {
    var b = Md[a.key] || a.key;
    if ("Unidentified" !== b) return b;
  }
  return "keypress" === a.type ? (a = od(a), 13 === a ? "Enter" : String.fromCharCode(a)) : "keydown" === a.type || "keyup" === a.type ? Nd[a.keyCode] || "Unidentified" : "";
}, code: 0, location: 0, ctrlKey: 0, shiftKey: 0, altKey: 0, metaKey: 0, repeat: 0, locale: 0, getModifierState: zd, charCode: function(a) {
  return "keypress" === a.type ? od(a) : 0;
}, keyCode: function(a) {
  return "keydown" === a.type || "keyup" === a.type ? a.keyCode : 0;
}, which: function(a) {
  return "keypress" === a.type ? od(a) : "keydown" === a.type || "keyup" === a.type ? a.keyCode : 0;
} }), Rd = rd(Qd), Sd = A({}, Ad, { pointerId: 0, width: 0, height: 0, pressure: 0, tangentialPressure: 0, tiltX: 0, tiltY: 0, twist: 0, pointerType: 0, isPrimary: 0 }), Td = rd(Sd), Ud = A({}, ud, { touches: 0, targetTouches: 0, changedTouches: 0, altKey: 0, metaKey: 0, ctrlKey: 0, shiftKey: 0, getModifierState: zd }), Vd = rd(Ud), Wd = A({}, sd, { propertyName: 0, elapsedTime: 0, pseudoElement: 0 }), Xd = rd(Wd), Yd = A({}, Ad, {
  deltaX: function(a) {
    return "deltaX" in a ? a.deltaX : "wheelDeltaX" in a ? -a.wheelDeltaX : 0;
  },
  deltaY: function(a) {
    return "deltaY" in a ? a.deltaY : "wheelDeltaY" in a ? -a.wheelDeltaY : "wheelDelta" in a ? -a.wheelDelta : 0;
  },
  deltaZ: 0,
  deltaMode: 0
}), Zd = rd(Yd), $d = [9, 13, 27, 32], ae = ia && "CompositionEvent" in window, be = null;
ia && "documentMode" in document && (be = document.documentMode);
var ce = ia && "TextEvent" in window && !be, de = ia && (!ae || be && 8 < be && 11 >= be), ee = String.fromCharCode(32), fe = false;
function ge(a, b) {
  switch (a) {
    case "keyup":
      return -1 !== $d.indexOf(b.keyCode);
    case "keydown":
      return 229 !== b.keyCode;
    case "keypress":
    case "mousedown":
    case "focusout":
      return true;
    default:
      return false;
  }
}
function he(a) {
  a = a.detail;
  return "object" === typeof a && "data" in a ? a.data : null;
}
var ie = false;
function je(a, b) {
  switch (a) {
    case "compositionend":
      return he(b);
    case "keypress":
      if (32 !== b.which) return null;
      fe = true;
      return ee;
    case "textInput":
      return a = b.data, a === ee && fe ? null : a;
    default:
      return null;
  }
}
function ke(a, b) {
  if (ie) return "compositionend" === a || !ae && ge(a, b) ? (a = nd(), md = ld = kd = null, ie = false, a) : null;
  switch (a) {
    case "paste":
      return null;
    case "keypress":
      if (!(b.ctrlKey || b.altKey || b.metaKey) || b.ctrlKey && b.altKey) {
        if (b.char && 1 < b.char.length) return b.char;
        if (b.which) return String.fromCharCode(b.which);
      }
      return null;
    case "compositionend":
      return de && "ko" !== b.locale ? null : b.data;
    default:
      return null;
  }
}
var le = { color: true, date: true, datetime: true, "datetime-local": true, email: true, month: true, number: true, password: true, range: true, search: true, tel: true, text: true, time: true, url: true, week: true };
function me(a) {
  var b = a && a.nodeName && a.nodeName.toLowerCase();
  return "input" === b ? !!le[a.type] : "textarea" === b ? true : false;
}
function ne(a, b, c, d) {
  Eb(d);
  b = oe(b, "onChange");
  0 < b.length && (c = new td("onChange", "change", null, c, d), a.push({ event: c, listeners: b }));
}
var pe = null, qe = null;
function re(a) {
  se(a, 0);
}
function te(a) {
  var b = ue(a);
  if (Wa(b)) return a;
}
function ve(a, b) {
  if ("change" === a) return b;
}
var we = false;
if (ia) {
  var xe;
  if (ia) {
    var ye = "oninput" in document;
    if (!ye) {
      var ze = document.createElement("div");
      ze.setAttribute("oninput", "return;");
      ye = "function" === typeof ze.oninput;
    }
    xe = ye;
  } else xe = false;
  we = xe && (!document.documentMode || 9 < document.documentMode);
}
function Ae() {
  pe && (pe.detachEvent("onpropertychange", Be), qe = pe = null);
}
function Be(a) {
  if ("value" === a.propertyName && te(qe)) {
    var b = [];
    ne(b, qe, a, xb(a));
    Jb(re, b);
  }
}
function Ce(a, b, c) {
  "focusin" === a ? (Ae(), pe = b, qe = c, pe.attachEvent("onpropertychange", Be)) : "focusout" === a && Ae();
}
function De(a) {
  if ("selectionchange" === a || "keyup" === a || "keydown" === a) return te(qe);
}
function Ee(a, b) {
  if ("click" === a) return te(b);
}
function Fe(a, b) {
  if ("input" === a || "change" === a) return te(b);
}
function Ge(a, b) {
  return a === b && (0 !== a || 1 / a === 1 / b) || a !== a && b !== b;
}
var He = "function" === typeof Object.is ? Object.is : Ge;
function Ie(a, b) {
  if (He(a, b)) return true;
  if ("object" !== typeof a || null === a || "object" !== typeof b || null === b) return false;
  var c = Object.keys(a), d = Object.keys(b);
  if (c.length !== d.length) return false;
  for (d = 0; d < c.length; d++) {
    var e = c[d];
    if (!ja.call(b, e) || !He(a[e], b[e])) return false;
  }
  return true;
}
function Je(a) {
  for (; a && a.firstChild; ) a = a.firstChild;
  return a;
}
function Ke(a, b) {
  var c = Je(a);
  a = 0;
  for (var d; c; ) {
    if (3 === c.nodeType) {
      d = a + c.textContent.length;
      if (a <= b && d >= b) return { node: c, offset: b - a };
      a = d;
    }
    a: {
      for (; c; ) {
        if (c.nextSibling) {
          c = c.nextSibling;
          break a;
        }
        c = c.parentNode;
      }
      c = void 0;
    }
    c = Je(c);
  }
}
function Le(a, b) {
  return a && b ? a === b ? true : a && 3 === a.nodeType ? false : b && 3 === b.nodeType ? Le(a, b.parentNode) : "contains" in a ? a.contains(b) : a.compareDocumentPosition ? !!(a.compareDocumentPosition(b) & 16) : false : false;
}
function Me() {
  for (var a = window, b = Xa(); b instanceof a.HTMLIFrameElement; ) {
    try {
      var c = "string" === typeof b.contentWindow.location.href;
    } catch (d) {
      c = false;
    }
    if (c) a = b.contentWindow;
    else break;
    b = Xa(a.document);
  }
  return b;
}
function Ne(a) {
  var b = a && a.nodeName && a.nodeName.toLowerCase();
  return b && ("input" === b && ("text" === a.type || "search" === a.type || "tel" === a.type || "url" === a.type || "password" === a.type) || "textarea" === b || "true" === a.contentEditable);
}
function Oe(a) {
  var b = Me(), c = a.focusedElem, d = a.selectionRange;
  if (b !== c && c && c.ownerDocument && Le(c.ownerDocument.documentElement, c)) {
    if (null !== d && Ne(c)) {
      if (b = d.start, a = d.end, void 0 === a && (a = b), "selectionStart" in c) c.selectionStart = b, c.selectionEnd = Math.min(a, c.value.length);
      else if (a = (b = c.ownerDocument || document) && b.defaultView || window, a.getSelection) {
        a = a.getSelection();
        var e = c.textContent.length, f2 = Math.min(d.start, e);
        d = void 0 === d.end ? f2 : Math.min(d.end, e);
        !a.extend && f2 > d && (e = d, d = f2, f2 = e);
        e = Ke(c, f2);
        var g = Ke(
          c,
          d
        );
        e && g && (1 !== a.rangeCount || a.anchorNode !== e.node || a.anchorOffset !== e.offset || a.focusNode !== g.node || a.focusOffset !== g.offset) && (b = b.createRange(), b.setStart(e.node, e.offset), a.removeAllRanges(), f2 > d ? (a.addRange(b), a.extend(g.node, g.offset)) : (b.setEnd(g.node, g.offset), a.addRange(b)));
      }
    }
    b = [];
    for (a = c; a = a.parentNode; ) 1 === a.nodeType && b.push({ element: a, left: a.scrollLeft, top: a.scrollTop });
    "function" === typeof c.focus && c.focus();
    for (c = 0; c < b.length; c++) a = b[c], a.element.scrollLeft = a.left, a.element.scrollTop = a.top;
  }
}
var Pe = ia && "documentMode" in document && 11 >= document.documentMode, Qe = null, Re = null, Se = null, Te = false;
function Ue(a, b, c) {
  var d = c.window === c ? c.document : 9 === c.nodeType ? c : c.ownerDocument;
  Te || null == Qe || Qe !== Xa(d) || (d = Qe, "selectionStart" in d && Ne(d) ? d = { start: d.selectionStart, end: d.selectionEnd } : (d = (d.ownerDocument && d.ownerDocument.defaultView || window).getSelection(), d = { anchorNode: d.anchorNode, anchorOffset: d.anchorOffset, focusNode: d.focusNode, focusOffset: d.focusOffset }), Se && Ie(Se, d) || (Se = d, d = oe(Re, "onSelect"), 0 < d.length && (b = new td("onSelect", "select", null, b, c), a.push({ event: b, listeners: d }), b.target = Qe)));
}
function Ve(a, b) {
  var c = {};
  c[a.toLowerCase()] = b.toLowerCase();
  c["Webkit" + a] = "webkit" + b;
  c["Moz" + a] = "moz" + b;
  return c;
}
var We = { animationend: Ve("Animation", "AnimationEnd"), animationiteration: Ve("Animation", "AnimationIteration"), animationstart: Ve("Animation", "AnimationStart"), transitionend: Ve("Transition", "TransitionEnd") }, Xe = {}, Ye = {};
ia && (Ye = document.createElement("div").style, "AnimationEvent" in window || (delete We.animationend.animation, delete We.animationiteration.animation, delete We.animationstart.animation), "TransitionEvent" in window || delete We.transitionend.transition);
function Ze(a) {
  if (Xe[a]) return Xe[a];
  if (!We[a]) return a;
  var b = We[a], c;
  for (c in b) if (b.hasOwnProperty(c) && c in Ye) return Xe[a] = b[c];
  return a;
}
var $e = Ze("animationend"), af = Ze("animationiteration"), bf = Ze("animationstart"), cf = Ze("transitionend"), df = /* @__PURE__ */ new Map(), ef = "abort auxClick cancel canPlay canPlayThrough click close contextMenu copy cut drag dragEnd dragEnter dragExit dragLeave dragOver dragStart drop durationChange emptied encrypted ended error gotPointerCapture input invalid keyDown keyPress keyUp load loadedData loadedMetadata loadStart lostPointerCapture mouseDown mouseMove mouseOut mouseOver mouseUp paste pause play playing pointerCancel pointerDown pointerMove pointerOut pointerOver pointerUp progress rateChange reset resize seeked seeking stalled submit suspend timeUpdate touchCancel touchEnd touchStart volumeChange scroll toggle touchMove waiting wheel".split(" ");
function ff(a, b) {
  df.set(a, b);
  fa(b, [a]);
}
for (var gf = 0; gf < ef.length; gf++) {
  var hf = ef[gf], jf = hf.toLowerCase(), kf = hf[0].toUpperCase() + hf.slice(1);
  ff(jf, "on" + kf);
}
ff($e, "onAnimationEnd");
ff(af, "onAnimationIteration");
ff(bf, "onAnimationStart");
ff("dblclick", "onDoubleClick");
ff("focusin", "onFocus");
ff("focusout", "onBlur");
ff(cf, "onTransitionEnd");
ha("onMouseEnter", ["mouseout", "mouseover"]);
ha("onMouseLeave", ["mouseout", "mouseover"]);
ha("onPointerEnter", ["pointerout", "pointerover"]);
ha("onPointerLeave", ["pointerout", "pointerover"]);
fa("onChange", "change click focusin focusout input keydown keyup selectionchange".split(" "));
fa("onSelect", "focusout contextmenu dragend focusin keydown keyup mousedown mouseup selectionchange".split(" "));
fa("onBeforeInput", ["compositionend", "keypress", "textInput", "paste"]);
fa("onCompositionEnd", "compositionend focusout keydown keypress keyup mousedown".split(" "));
fa("onCompositionStart", "compositionstart focusout keydown keypress keyup mousedown".split(" "));
fa("onCompositionUpdate", "compositionupdate focusout keydown keypress keyup mousedown".split(" "));
var lf = "abort canplay canplaythrough durationchange emptied encrypted ended error loadeddata loadedmetadata loadstart pause play playing progress ratechange resize seeked seeking stalled suspend timeupdate volumechange waiting".split(" "), mf = new Set("cancel close invalid load scroll toggle".split(" ").concat(lf));
function nf(a, b, c) {
  var d = a.type || "unknown-event";
  a.currentTarget = c;
  Ub(d, b, void 0, a);
  a.currentTarget = null;
}
function se(a, b) {
  b = 0 !== (b & 4);
  for (var c = 0; c < a.length; c++) {
    var d = a[c], e = d.event;
    d = d.listeners;
    a: {
      var f2 = void 0;
      if (b) for (var g = d.length - 1; 0 <= g; g--) {
        var h = d[g], k2 = h.instance, l2 = h.currentTarget;
        h = h.listener;
        if (k2 !== f2 && e.isPropagationStopped()) break a;
        nf(e, h, l2);
        f2 = k2;
      }
      else for (g = 0; g < d.length; g++) {
        h = d[g];
        k2 = h.instance;
        l2 = h.currentTarget;
        h = h.listener;
        if (k2 !== f2 && e.isPropagationStopped()) break a;
        nf(e, h, l2);
        f2 = k2;
      }
    }
  }
  if (Qb) throw a = Rb, Qb = false, Rb = null, a;
}
function D(a, b) {
  var c = b[of];
  void 0 === c && (c = b[of] = /* @__PURE__ */ new Set());
  var d = a + "__bubble";
  c.has(d) || (pf(b, a, 2, false), c.add(d));
}
function qf(a, b, c) {
  var d = 0;
  b && (d |= 4);
  pf(c, a, d, b);
}
var rf = "_reactListening" + Math.random().toString(36).slice(2);
function sf(a) {
  if (!a[rf]) {
    a[rf] = true;
    da.forEach(function(b2) {
      "selectionchange" !== b2 && (mf.has(b2) || qf(b2, false, a), qf(b2, true, a));
    });
    var b = 9 === a.nodeType ? a : a.ownerDocument;
    null === b || b[rf] || (b[rf] = true, qf("selectionchange", false, b));
  }
}
function pf(a, b, c, d) {
  switch (jd(b)) {
    case 1:
      var e = ed;
      break;
    case 4:
      e = gd;
      break;
    default:
      e = fd;
  }
  c = e.bind(null, b, c, a);
  e = void 0;
  !Lb || "touchstart" !== b && "touchmove" !== b && "wheel" !== b || (e = true);
  d ? void 0 !== e ? a.addEventListener(b, c, { capture: true, passive: e }) : a.addEventListener(b, c, true) : void 0 !== e ? a.addEventListener(b, c, { passive: e }) : a.addEventListener(b, c, false);
}
function hd(a, b, c, d, e) {
  var f2 = d;
  if (0 === (b & 1) && 0 === (b & 2) && null !== d) a: for (; ; ) {
    if (null === d) return;
    var g = d.tag;
    if (3 === g || 4 === g) {
      var h = d.stateNode.containerInfo;
      if (h === e || 8 === h.nodeType && h.parentNode === e) break;
      if (4 === g) for (g = d.return; null !== g; ) {
        var k2 = g.tag;
        if (3 === k2 || 4 === k2) {
          if (k2 = g.stateNode.containerInfo, k2 === e || 8 === k2.nodeType && k2.parentNode === e) return;
        }
        g = g.return;
      }
      for (; null !== h; ) {
        g = Wc(h);
        if (null === g) return;
        k2 = g.tag;
        if (5 === k2 || 6 === k2) {
          d = f2 = g;
          continue a;
        }
        h = h.parentNode;
      }
    }
    d = d.return;
  }
  Jb(function() {
    var d2 = f2, e2 = xb(c), g2 = [];
    a: {
      var h2 = df.get(a);
      if (void 0 !== h2) {
        var k3 = td, n2 = a;
        switch (a) {
          case "keypress":
            if (0 === od(c)) break a;
          case "keydown":
          case "keyup":
            k3 = Rd;
            break;
          case "focusin":
            n2 = "focus";
            k3 = Fd;
            break;
          case "focusout":
            n2 = "blur";
            k3 = Fd;
            break;
          case "beforeblur":
          case "afterblur":
            k3 = Fd;
            break;
          case "click":
            if (2 === c.button) break a;
          case "auxclick":
          case "dblclick":
          case "mousedown":
          case "mousemove":
          case "mouseup":
          case "mouseout":
          case "mouseover":
          case "contextmenu":
            k3 = Bd;
            break;
          case "drag":
          case "dragend":
          case "dragenter":
          case "dragexit":
          case "dragleave":
          case "dragover":
          case "dragstart":
          case "drop":
            k3 = Dd;
            break;
          case "touchcancel":
          case "touchend":
          case "touchmove":
          case "touchstart":
            k3 = Vd;
            break;
          case $e:
          case af:
          case bf:
            k3 = Hd;
            break;
          case cf:
            k3 = Xd;
            break;
          case "scroll":
            k3 = vd;
            break;
          case "wheel":
            k3 = Zd;
            break;
          case "copy":
          case "cut":
          case "paste":
            k3 = Jd;
            break;
          case "gotpointercapture":
          case "lostpointercapture":
          case "pointercancel":
          case "pointerdown":
          case "pointermove":
          case "pointerout":
          case "pointerover":
          case "pointerup":
            k3 = Td;
        }
        var t2 = 0 !== (b & 4), J2 = !t2 && "scroll" === a, x2 = t2 ? null !== h2 ? h2 + "Capture" : null : h2;
        t2 = [];
        for (var w2 = d2, u2; null !== w2; ) {
          u2 = w2;
          var F2 = u2.stateNode;
          5 === u2.tag && null !== F2 && (u2 = F2, null !== x2 && (F2 = Kb(w2, x2), null != F2 && t2.push(tf(w2, F2, u2))));
          if (J2) break;
          w2 = w2.return;
        }
        0 < t2.length && (h2 = new k3(h2, n2, null, c, e2), g2.push({ event: h2, listeners: t2 }));
      }
    }
    if (0 === (b & 7)) {
      a: {
        h2 = "mouseover" === a || "pointerover" === a;
        k3 = "mouseout" === a || "pointerout" === a;
        if (h2 && c !== wb && (n2 = c.relatedTarget || c.fromElement) && (Wc(n2) || n2[uf])) break a;
        if (k3 || h2) {
          h2 = e2.window === e2 ? e2 : (h2 = e2.ownerDocument) ? h2.defaultView || h2.parentWindow : window;
          if (k3) {
            if (n2 = c.relatedTarget || c.toElement, k3 = d2, n2 = n2 ? Wc(n2) : null, null !== n2 && (J2 = Vb(n2), n2 !== J2 || 5 !== n2.tag && 6 !== n2.tag)) n2 = null;
          } else k3 = null, n2 = d2;
          if (k3 !== n2) {
            t2 = Bd;
            F2 = "onMouseLeave";
            x2 = "onMouseEnter";
            w2 = "mouse";
            if ("pointerout" === a || "pointerover" === a) t2 = Td, F2 = "onPointerLeave", x2 = "onPointerEnter", w2 = "pointer";
            J2 = null == k3 ? h2 : ue(k3);
            u2 = null == n2 ? h2 : ue(n2);
            h2 = new t2(F2, w2 + "leave", k3, c, e2);
            h2.target = J2;
            h2.relatedTarget = u2;
            F2 = null;
            Wc(e2) === d2 && (t2 = new t2(x2, w2 + "enter", n2, c, e2), t2.target = u2, t2.relatedTarget = J2, F2 = t2);
            J2 = F2;
            if (k3 && n2) b: {
              t2 = k3;
              x2 = n2;
              w2 = 0;
              for (u2 = t2; u2; u2 = vf(u2)) w2++;
              u2 = 0;
              for (F2 = x2; F2; F2 = vf(F2)) u2++;
              for (; 0 < w2 - u2; ) t2 = vf(t2), w2--;
              for (; 0 < u2 - w2; ) x2 = vf(x2), u2--;
              for (; w2--; ) {
                if (t2 === x2 || null !== x2 && t2 === x2.alternate) break b;
                t2 = vf(t2);
                x2 = vf(x2);
              }
              t2 = null;
            }
            else t2 = null;
            null !== k3 && wf(g2, h2, k3, t2, false);
            null !== n2 && null !== J2 && wf(g2, J2, n2, t2, true);
          }
        }
      }
      a: {
        h2 = d2 ? ue(d2) : window;
        k3 = h2.nodeName && h2.nodeName.toLowerCase();
        if ("select" === k3 || "input" === k3 && "file" === h2.type) var na = ve;
        else if (me(h2)) if (we) na = Fe;
        else {
          na = De;
          var xa = Ce;
        }
        else (k3 = h2.nodeName) && "input" === k3.toLowerCase() && ("checkbox" === h2.type || "radio" === h2.type) && (na = Ee);
        if (na && (na = na(a, d2))) {
          ne(g2, na, c, e2);
          break a;
        }
        xa && xa(a, h2, d2);
        "focusout" === a && (xa = h2._wrapperState) && xa.controlled && "number" === h2.type && cb(h2, "number", h2.value);
      }
      xa = d2 ? ue(d2) : window;
      switch (a) {
        case "focusin":
          if (me(xa) || "true" === xa.contentEditable) Qe = xa, Re = d2, Se = null;
          break;
        case "focusout":
          Se = Re = Qe = null;
          break;
        case "mousedown":
          Te = true;
          break;
        case "contextmenu":
        case "mouseup":
        case "dragend":
          Te = false;
          Ue(g2, c, e2);
          break;
        case "selectionchange":
          if (Pe) break;
        case "keydown":
        case "keyup":
          Ue(g2, c, e2);
      }
      var $a;
      if (ae) b: {
        switch (a) {
          case "compositionstart":
            var ba = "onCompositionStart";
            break b;
          case "compositionend":
            ba = "onCompositionEnd";
            break b;
          case "compositionupdate":
            ba = "onCompositionUpdate";
            break b;
        }
        ba = void 0;
      }
      else ie ? ge(a, c) && (ba = "onCompositionEnd") : "keydown" === a && 229 === c.keyCode && (ba = "onCompositionStart");
      ba && (de && "ko" !== c.locale && (ie || "onCompositionStart" !== ba ? "onCompositionEnd" === ba && ie && ($a = nd()) : (kd = e2, ld = "value" in kd ? kd.value : kd.textContent, ie = true)), xa = oe(d2, ba), 0 < xa.length && (ba = new Ld(ba, a, null, c, e2), g2.push({ event: ba, listeners: xa }), $a ? ba.data = $a : ($a = he(c), null !== $a && (ba.data = $a))));
      if ($a = ce ? je(a, c) : ke(a, c)) d2 = oe(d2, "onBeforeInput"), 0 < d2.length && (e2 = new Ld("onBeforeInput", "beforeinput", null, c, e2), g2.push({ event: e2, listeners: d2 }), e2.data = $a);
    }
    se(g2, b);
  });
}
function tf(a, b, c) {
  return { instance: a, listener: b, currentTarget: c };
}
function oe(a, b) {
  for (var c = b + "Capture", d = []; null !== a; ) {
    var e = a, f2 = e.stateNode;
    5 === e.tag && null !== f2 && (e = f2, f2 = Kb(a, c), null != f2 && d.unshift(tf(a, f2, e)), f2 = Kb(a, b), null != f2 && d.push(tf(a, f2, e)));
    a = a.return;
  }
  return d;
}
function vf(a) {
  if (null === a) return null;
  do
    a = a.return;
  while (a && 5 !== a.tag);
  return a ? a : null;
}
function wf(a, b, c, d, e) {
  for (var f2 = b._reactName, g = []; null !== c && c !== d; ) {
    var h = c, k2 = h.alternate, l2 = h.stateNode;
    if (null !== k2 && k2 === d) break;
    5 === h.tag && null !== l2 && (h = l2, e ? (k2 = Kb(c, f2), null != k2 && g.unshift(tf(c, k2, h))) : e || (k2 = Kb(c, f2), null != k2 && g.push(tf(c, k2, h))));
    c = c.return;
  }
  0 !== g.length && a.push({ event: b, listeners: g });
}
var xf = /\r\n?/g, yf = /\u0000|\uFFFD/g;
function zf(a) {
  return ("string" === typeof a ? a : "" + a).replace(xf, "\n").replace(yf, "");
}
function Af(a, b, c) {
  b = zf(b);
  if (zf(a) !== b && c) throw Error(p(425));
}
function Bf() {
}
var Cf = null, Df = null;
function Ef(a, b) {
  return "textarea" === a || "noscript" === a || "string" === typeof b.children || "number" === typeof b.children || "object" === typeof b.dangerouslySetInnerHTML && null !== b.dangerouslySetInnerHTML && null != b.dangerouslySetInnerHTML.__html;
}
var Ff = "function" === typeof setTimeout ? setTimeout : void 0, Gf = "function" === typeof clearTimeout ? clearTimeout : void 0, Hf = "function" === typeof Promise ? Promise : void 0, Jf = "function" === typeof queueMicrotask ? queueMicrotask : "undefined" !== typeof Hf ? function(a) {
  return Hf.resolve(null).then(a).catch(If);
} : Ff;
function If(a) {
  setTimeout(function() {
    throw a;
  });
}
function Kf(a, b) {
  var c = b, d = 0;
  do {
    var e = c.nextSibling;
    a.removeChild(c);
    if (e && 8 === e.nodeType) if (c = e.data, "/$" === c) {
      if (0 === d) {
        a.removeChild(e);
        bd(b);
        return;
      }
      d--;
    } else "$" !== c && "$?" !== c && "$!" !== c || d++;
    c = e;
  } while (c);
  bd(b);
}
function Lf(a) {
  for (; null != a; a = a.nextSibling) {
    var b = a.nodeType;
    if (1 === b || 3 === b) break;
    if (8 === b) {
      b = a.data;
      if ("$" === b || "$!" === b || "$?" === b) break;
      if ("/$" === b) return null;
    }
  }
  return a;
}
function Mf(a) {
  a = a.previousSibling;
  for (var b = 0; a; ) {
    if (8 === a.nodeType) {
      var c = a.data;
      if ("$" === c || "$!" === c || "$?" === c) {
        if (0 === b) return a;
        b--;
      } else "/$" === c && b++;
    }
    a = a.previousSibling;
  }
  return null;
}
var Nf = Math.random().toString(36).slice(2), Of = "__reactFiber$" + Nf, Pf = "__reactProps$" + Nf, uf = "__reactContainer$" + Nf, of = "__reactEvents$" + Nf, Qf = "__reactListeners$" + Nf, Rf = "__reactHandles$" + Nf;
function Wc(a) {
  var b = a[Of];
  if (b) return b;
  for (var c = a.parentNode; c; ) {
    if (b = c[uf] || c[Of]) {
      c = b.alternate;
      if (null !== b.child || null !== c && null !== c.child) for (a = Mf(a); null !== a; ) {
        if (c = a[Of]) return c;
        a = Mf(a);
      }
      return b;
    }
    a = c;
    c = a.parentNode;
  }
  return null;
}
function Cb(a) {
  a = a[Of] || a[uf];
  return !a || 5 !== a.tag && 6 !== a.tag && 13 !== a.tag && 3 !== a.tag ? null : a;
}
function ue(a) {
  if (5 === a.tag || 6 === a.tag) return a.stateNode;
  throw Error(p(33));
}
function Db(a) {
  return a[Pf] || null;
}
var Sf = [], Tf = -1;
function Uf(a) {
  return { current: a };
}
function E(a) {
  0 > Tf || (a.current = Sf[Tf], Sf[Tf] = null, Tf--);
}
function G(a, b) {
  Tf++;
  Sf[Tf] = a.current;
  a.current = b;
}
var Vf = {}, H = Uf(Vf), Wf = Uf(false), Xf = Vf;
function Yf(a, b) {
  var c = a.type.contextTypes;
  if (!c) return Vf;
  var d = a.stateNode;
  if (d && d.__reactInternalMemoizedUnmaskedChildContext === b) return d.__reactInternalMemoizedMaskedChildContext;
  var e = {}, f2;
  for (f2 in c) e[f2] = b[f2];
  d && (a = a.stateNode, a.__reactInternalMemoizedUnmaskedChildContext = b, a.__reactInternalMemoizedMaskedChildContext = e);
  return e;
}
function Zf(a) {
  a = a.childContextTypes;
  return null !== a && void 0 !== a;
}
function $f() {
  E(Wf);
  E(H);
}
function ag(a, b, c) {
  if (H.current !== Vf) throw Error(p(168));
  G(H, b);
  G(Wf, c);
}
function bg(a, b, c) {
  var d = a.stateNode;
  b = b.childContextTypes;
  if ("function" !== typeof d.getChildContext) return c;
  d = d.getChildContext();
  for (var e in d) if (!(e in b)) throw Error(p(108, Ra(a) || "Unknown", e));
  return A({}, c, d);
}
function cg(a) {
  a = (a = a.stateNode) && a.__reactInternalMemoizedMergedChildContext || Vf;
  Xf = H.current;
  G(H, a);
  G(Wf, Wf.current);
  return true;
}
function dg(a, b, c) {
  var d = a.stateNode;
  if (!d) throw Error(p(169));
  c ? (a = bg(a, b, Xf), d.__reactInternalMemoizedMergedChildContext = a, E(Wf), E(H), G(H, a)) : E(Wf);
  G(Wf, c);
}
var eg = null, fg = false, gg = false;
function hg(a) {
  null === eg ? eg = [a] : eg.push(a);
}
function ig(a) {
  fg = true;
  hg(a);
}
function jg() {
  if (!gg && null !== eg) {
    gg = true;
    var a = 0, b = C;
    try {
      var c = eg;
      for (C = 1; a < c.length; a++) {
        var d = c[a];
        do
          d = d(true);
        while (null !== d);
      }
      eg = null;
      fg = false;
    } catch (e) {
      throw null !== eg && (eg = eg.slice(a + 1)), ac(fc, jg), e;
    } finally {
      C = b, gg = false;
    }
  }
  return null;
}
var kg = [], lg = 0, mg = null, ng = 0, og = [], pg = 0, qg = null, rg = 1, sg = "";
function tg(a, b) {
  kg[lg++] = ng;
  kg[lg++] = mg;
  mg = a;
  ng = b;
}
function ug(a, b, c) {
  og[pg++] = rg;
  og[pg++] = sg;
  og[pg++] = qg;
  qg = a;
  var d = rg;
  a = sg;
  var e = 32 - oc(d) - 1;
  d &= ~(1 << e);
  c += 1;
  var f2 = 32 - oc(b) + e;
  if (30 < f2) {
    var g = e - e % 5;
    f2 = (d & (1 << g) - 1).toString(32);
    d >>= g;
    e -= g;
    rg = 1 << 32 - oc(b) + e | c << e | d;
    sg = f2 + a;
  } else rg = 1 << f2 | c << e | d, sg = a;
}
function vg(a) {
  null !== a.return && (tg(a, 1), ug(a, 1, 0));
}
function wg(a) {
  for (; a === mg; ) mg = kg[--lg], kg[lg] = null, ng = kg[--lg], kg[lg] = null;
  for (; a === qg; ) qg = og[--pg], og[pg] = null, sg = og[--pg], og[pg] = null, rg = og[--pg], og[pg] = null;
}
var xg = null, yg = null, I = false, zg = null;
function Ag(a, b) {
  var c = Bg(5, null, null, 0);
  c.elementType = "DELETED";
  c.stateNode = b;
  c.return = a;
  b = a.deletions;
  null === b ? (a.deletions = [c], a.flags |= 16) : b.push(c);
}
function Cg(a, b) {
  switch (a.tag) {
    case 5:
      var c = a.type;
      b = 1 !== b.nodeType || c.toLowerCase() !== b.nodeName.toLowerCase() ? null : b;
      return null !== b ? (a.stateNode = b, xg = a, yg = Lf(b.firstChild), true) : false;
    case 6:
      return b = "" === a.pendingProps || 3 !== b.nodeType ? null : b, null !== b ? (a.stateNode = b, xg = a, yg = null, true) : false;
    case 13:
      return b = 8 !== b.nodeType ? null : b, null !== b ? (c = null !== qg ? { id: rg, overflow: sg } : null, a.memoizedState = { dehydrated: b, treeContext: c, retryLane: 1073741824 }, c = Bg(18, null, null, 0), c.stateNode = b, c.return = a, a.child = c, xg = a, yg = null, true) : false;
    default:
      return false;
  }
}
function Dg(a) {
  return 0 !== (a.mode & 1) && 0 === (a.flags & 128);
}
function Eg(a) {
  if (I) {
    var b = yg;
    if (b) {
      var c = b;
      if (!Cg(a, b)) {
        if (Dg(a)) throw Error(p(418));
        b = Lf(c.nextSibling);
        var d = xg;
        b && Cg(a, b) ? Ag(d, c) : (a.flags = a.flags & -4097 | 2, I = false, xg = a);
      }
    } else {
      if (Dg(a)) throw Error(p(418));
      a.flags = a.flags & -4097 | 2;
      I = false;
      xg = a;
    }
  }
}
function Fg(a) {
  for (a = a.return; null !== a && 5 !== a.tag && 3 !== a.tag && 13 !== a.tag; ) a = a.return;
  xg = a;
}
function Gg(a) {
  if (a !== xg) return false;
  if (!I) return Fg(a), I = true, false;
  var b;
  (b = 3 !== a.tag) && !(b = 5 !== a.tag) && (b = a.type, b = "head" !== b && "body" !== b && !Ef(a.type, a.memoizedProps));
  if (b && (b = yg)) {
    if (Dg(a)) throw Hg(), Error(p(418));
    for (; b; ) Ag(a, b), b = Lf(b.nextSibling);
  }
  Fg(a);
  if (13 === a.tag) {
    a = a.memoizedState;
    a = null !== a ? a.dehydrated : null;
    if (!a) throw Error(p(317));
    a: {
      a = a.nextSibling;
      for (b = 0; a; ) {
        if (8 === a.nodeType) {
          var c = a.data;
          if ("/$" === c) {
            if (0 === b) {
              yg = Lf(a.nextSibling);
              break a;
            }
            b--;
          } else "$" !== c && "$!" !== c && "$?" !== c || b++;
        }
        a = a.nextSibling;
      }
      yg = null;
    }
  } else yg = xg ? Lf(a.stateNode.nextSibling) : null;
  return true;
}
function Hg() {
  for (var a = yg; a; ) a = Lf(a.nextSibling);
}
function Ig() {
  yg = xg = null;
  I = false;
}
function Jg(a) {
  null === zg ? zg = [a] : zg.push(a);
}
var Kg = ua.ReactCurrentBatchConfig;
function Lg(a, b, c) {
  a = c.ref;
  if (null !== a && "function" !== typeof a && "object" !== typeof a) {
    if (c._owner) {
      c = c._owner;
      if (c) {
        if (1 !== c.tag) throw Error(p(309));
        var d = c.stateNode;
      }
      if (!d) throw Error(p(147, a));
      var e = d, f2 = "" + a;
      if (null !== b && null !== b.ref && "function" === typeof b.ref && b.ref._stringRef === f2) return b.ref;
      b = function(a2) {
        var b2 = e.refs;
        null === a2 ? delete b2[f2] : b2[f2] = a2;
      };
      b._stringRef = f2;
      return b;
    }
    if ("string" !== typeof a) throw Error(p(284));
    if (!c._owner) throw Error(p(290, a));
  }
  return a;
}
function Mg(a, b) {
  a = Object.prototype.toString.call(b);
  throw Error(p(31, "[object Object]" === a ? "object with keys {" + Object.keys(b).join(", ") + "}" : a));
}
function Ng(a) {
  var b = a._init;
  return b(a._payload);
}
function Og(a) {
  function b(b2, c2) {
    if (a) {
      var d2 = b2.deletions;
      null === d2 ? (b2.deletions = [c2], b2.flags |= 16) : d2.push(c2);
    }
  }
  function c(c2, d2) {
    if (!a) return null;
    for (; null !== d2; ) b(c2, d2), d2 = d2.sibling;
    return null;
  }
  function d(a2, b2) {
    for (a2 = /* @__PURE__ */ new Map(); null !== b2; ) null !== b2.key ? a2.set(b2.key, b2) : a2.set(b2.index, b2), b2 = b2.sibling;
    return a2;
  }
  function e(a2, b2) {
    a2 = Pg(a2, b2);
    a2.index = 0;
    a2.sibling = null;
    return a2;
  }
  function f2(b2, c2, d2) {
    b2.index = d2;
    if (!a) return b2.flags |= 1048576, c2;
    d2 = b2.alternate;
    if (null !== d2) return d2 = d2.index, d2 < c2 ? (b2.flags |= 2, c2) : d2;
    b2.flags |= 2;
    return c2;
  }
  function g(b2) {
    a && null === b2.alternate && (b2.flags |= 2);
    return b2;
  }
  function h(a2, b2, c2, d2) {
    if (null === b2 || 6 !== b2.tag) return b2 = Qg(c2, a2.mode, d2), b2.return = a2, b2;
    b2 = e(b2, c2);
    b2.return = a2;
    return b2;
  }
  function k2(a2, b2, c2, d2) {
    var f3 = c2.type;
    if (f3 === ya) return m2(a2, b2, c2.props.children, d2, c2.key);
    if (null !== b2 && (b2.elementType === f3 || "object" === typeof f3 && null !== f3 && f3.$$typeof === Ha && Ng(f3) === b2.type)) return d2 = e(b2, c2.props), d2.ref = Lg(a2, b2, c2), d2.return = a2, d2;
    d2 = Rg(c2.type, c2.key, c2.props, null, a2.mode, d2);
    d2.ref = Lg(a2, b2, c2);
    d2.return = a2;
    return d2;
  }
  function l2(a2, b2, c2, d2) {
    if (null === b2 || 4 !== b2.tag || b2.stateNode.containerInfo !== c2.containerInfo || b2.stateNode.implementation !== c2.implementation) return b2 = Sg(c2, a2.mode, d2), b2.return = a2, b2;
    b2 = e(b2, c2.children || []);
    b2.return = a2;
    return b2;
  }
  function m2(a2, b2, c2, d2, f3) {
    if (null === b2 || 7 !== b2.tag) return b2 = Tg(c2, a2.mode, d2, f3), b2.return = a2, b2;
    b2 = e(b2, c2);
    b2.return = a2;
    return b2;
  }
  function q2(a2, b2, c2) {
    if ("string" === typeof b2 && "" !== b2 || "number" === typeof b2) return b2 = Qg("" + b2, a2.mode, c2), b2.return = a2, b2;
    if ("object" === typeof b2 && null !== b2) {
      switch (b2.$$typeof) {
        case va:
          return c2 = Rg(b2.type, b2.key, b2.props, null, a2.mode, c2), c2.ref = Lg(a2, null, b2), c2.return = a2, c2;
        case wa:
          return b2 = Sg(b2, a2.mode, c2), b2.return = a2, b2;
        case Ha:
          var d2 = b2._init;
          return q2(a2, d2(b2._payload), c2);
      }
      if (eb(b2) || Ka(b2)) return b2 = Tg(b2, a2.mode, c2, null), b2.return = a2, b2;
      Mg(a2, b2);
    }
    return null;
  }
  function r2(a2, b2, c2, d2) {
    var e2 = null !== b2 ? b2.key : null;
    if ("string" === typeof c2 && "" !== c2 || "number" === typeof c2) return null !== e2 ? null : h(a2, b2, "" + c2, d2);
    if ("object" === typeof c2 && null !== c2) {
      switch (c2.$$typeof) {
        case va:
          return c2.key === e2 ? k2(a2, b2, c2, d2) : null;
        case wa:
          return c2.key === e2 ? l2(a2, b2, c2, d2) : null;
        case Ha:
          return e2 = c2._init, r2(
            a2,
            b2,
            e2(c2._payload),
            d2
          );
      }
      if (eb(c2) || Ka(c2)) return null !== e2 ? null : m2(a2, b2, c2, d2, null);
      Mg(a2, c2);
    }
    return null;
  }
  function y2(a2, b2, c2, d2, e2) {
    if ("string" === typeof d2 && "" !== d2 || "number" === typeof d2) return a2 = a2.get(c2) || null, h(b2, a2, "" + d2, e2);
    if ("object" === typeof d2 && null !== d2) {
      switch (d2.$$typeof) {
        case va:
          return a2 = a2.get(null === d2.key ? c2 : d2.key) || null, k2(b2, a2, d2, e2);
        case wa:
          return a2 = a2.get(null === d2.key ? c2 : d2.key) || null, l2(b2, a2, d2, e2);
        case Ha:
          var f3 = d2._init;
          return y2(a2, b2, c2, f3(d2._payload), e2);
      }
      if (eb(d2) || Ka(d2)) return a2 = a2.get(c2) || null, m2(b2, a2, d2, e2, null);
      Mg(b2, d2);
    }
    return null;
  }
  function n2(e2, g2, h2, k3) {
    for (var l3 = null, m3 = null, u2 = g2, w2 = g2 = 0, x2 = null; null !== u2 && w2 < h2.length; w2++) {
      u2.index > w2 ? (x2 = u2, u2 = null) : x2 = u2.sibling;
      var n3 = r2(e2, u2, h2[w2], k3);
      if (null === n3) {
        null === u2 && (u2 = x2);
        break;
      }
      a && u2 && null === n3.alternate && b(e2, u2);
      g2 = f2(n3, g2, w2);
      null === m3 ? l3 = n3 : m3.sibling = n3;
      m3 = n3;
      u2 = x2;
    }
    if (w2 === h2.length) return c(e2, u2), I && tg(e2, w2), l3;
    if (null === u2) {
      for (; w2 < h2.length; w2++) u2 = q2(e2, h2[w2], k3), null !== u2 && (g2 = f2(u2, g2, w2), null === m3 ? l3 = u2 : m3.sibling = u2, m3 = u2);
      I && tg(e2, w2);
      return l3;
    }
    for (u2 = d(e2, u2); w2 < h2.length; w2++) x2 = y2(u2, e2, w2, h2[w2], k3), null !== x2 && (a && null !== x2.alternate && u2.delete(null === x2.key ? w2 : x2.key), g2 = f2(x2, g2, w2), null === m3 ? l3 = x2 : m3.sibling = x2, m3 = x2);
    a && u2.forEach(function(a2) {
      return b(e2, a2);
    });
    I && tg(e2, w2);
    return l3;
  }
  function t2(e2, g2, h2, k3) {
    var l3 = Ka(h2);
    if ("function" !== typeof l3) throw Error(p(150));
    h2 = l3.call(h2);
    if (null == h2) throw Error(p(151));
    for (var u2 = l3 = null, m3 = g2, w2 = g2 = 0, x2 = null, n3 = h2.next(); null !== m3 && !n3.done; w2++, n3 = h2.next()) {
      m3.index > w2 ? (x2 = m3, m3 = null) : x2 = m3.sibling;
      var t3 = r2(e2, m3, n3.value, k3);
      if (null === t3) {
        null === m3 && (m3 = x2);
        break;
      }
      a && m3 && null === t3.alternate && b(e2, m3);
      g2 = f2(t3, g2, w2);
      null === u2 ? l3 = t3 : u2.sibling = t3;
      u2 = t3;
      m3 = x2;
    }
    if (n3.done) return c(
      e2,
      m3
    ), I && tg(e2, w2), l3;
    if (null === m3) {
      for (; !n3.done; w2++, n3 = h2.next()) n3 = q2(e2, n3.value, k3), null !== n3 && (g2 = f2(n3, g2, w2), null === u2 ? l3 = n3 : u2.sibling = n3, u2 = n3);
      I && tg(e2, w2);
      return l3;
    }
    for (m3 = d(e2, m3); !n3.done; w2++, n3 = h2.next()) n3 = y2(m3, e2, w2, n3.value, k3), null !== n3 && (a && null !== n3.alternate && m3.delete(null === n3.key ? w2 : n3.key), g2 = f2(n3, g2, w2), null === u2 ? l3 = n3 : u2.sibling = n3, u2 = n3);
    a && m3.forEach(function(a2) {
      return b(e2, a2);
    });
    I && tg(e2, w2);
    return l3;
  }
  function J2(a2, d2, f3, h2) {
    "object" === typeof f3 && null !== f3 && f3.type === ya && null === f3.key && (f3 = f3.props.children);
    if ("object" === typeof f3 && null !== f3) {
      switch (f3.$$typeof) {
        case va:
          a: {
            for (var k3 = f3.key, l3 = d2; null !== l3; ) {
              if (l3.key === k3) {
                k3 = f3.type;
                if (k3 === ya) {
                  if (7 === l3.tag) {
                    c(a2, l3.sibling);
                    d2 = e(l3, f3.props.children);
                    d2.return = a2;
                    a2 = d2;
                    break a;
                  }
                } else if (l3.elementType === k3 || "object" === typeof k3 && null !== k3 && k3.$$typeof === Ha && Ng(k3) === l3.type) {
                  c(a2, l3.sibling);
                  d2 = e(l3, f3.props);
                  d2.ref = Lg(a2, l3, f3);
                  d2.return = a2;
                  a2 = d2;
                  break a;
                }
                c(a2, l3);
                break;
              } else b(a2, l3);
              l3 = l3.sibling;
            }
            f3.type === ya ? (d2 = Tg(f3.props.children, a2.mode, h2, f3.key), d2.return = a2, a2 = d2) : (h2 = Rg(f3.type, f3.key, f3.props, null, a2.mode, h2), h2.ref = Lg(a2, d2, f3), h2.return = a2, a2 = h2);
          }
          return g(a2);
        case wa:
          a: {
            for (l3 = f3.key; null !== d2; ) {
              if (d2.key === l3) if (4 === d2.tag && d2.stateNode.containerInfo === f3.containerInfo && d2.stateNode.implementation === f3.implementation) {
                c(a2, d2.sibling);
                d2 = e(d2, f3.children || []);
                d2.return = a2;
                a2 = d2;
                break a;
              } else {
                c(a2, d2);
                break;
              }
              else b(a2, d2);
              d2 = d2.sibling;
            }
            d2 = Sg(f3, a2.mode, h2);
            d2.return = a2;
            a2 = d2;
          }
          return g(a2);
        case Ha:
          return l3 = f3._init, J2(a2, d2, l3(f3._payload), h2);
      }
      if (eb(f3)) return n2(a2, d2, f3, h2);
      if (Ka(f3)) return t2(a2, d2, f3, h2);
      Mg(a2, f3);
    }
    return "string" === typeof f3 && "" !== f3 || "number" === typeof f3 ? (f3 = "" + f3, null !== d2 && 6 === d2.tag ? (c(a2, d2.sibling), d2 = e(d2, f3), d2.return = a2, a2 = d2) : (c(a2, d2), d2 = Qg(f3, a2.mode, h2), d2.return = a2, a2 = d2), g(a2)) : c(a2, d2);
  }
  return J2;
}
var Ug = Og(true), Vg = Og(false), Wg = Uf(null), Xg = null, Yg = null, Zg = null;
function $g() {
  Zg = Yg = Xg = null;
}
function ah(a) {
  var b = Wg.current;
  E(Wg);
  a._currentValue = b;
}
function bh(a, b, c) {
  for (; null !== a; ) {
    var d = a.alternate;
    (a.childLanes & b) !== b ? (a.childLanes |= b, null !== d && (d.childLanes |= b)) : null !== d && (d.childLanes & b) !== b && (d.childLanes |= b);
    if (a === c) break;
    a = a.return;
  }
}
function ch(a, b) {
  Xg = a;
  Zg = Yg = null;
  a = a.dependencies;
  null !== a && null !== a.firstContext && (0 !== (a.lanes & b) && (dh = true), a.firstContext = null);
}
function eh(a) {
  var b = a._currentValue;
  if (Zg !== a) if (a = { context: a, memoizedValue: b, next: null }, null === Yg) {
    if (null === Xg) throw Error(p(308));
    Yg = a;
    Xg.dependencies = { lanes: 0, firstContext: a };
  } else Yg = Yg.next = a;
  return b;
}
var fh = null;
function gh(a) {
  null === fh ? fh = [a] : fh.push(a);
}
function hh(a, b, c, d) {
  var e = b.interleaved;
  null === e ? (c.next = c, gh(b)) : (c.next = e.next, e.next = c);
  b.interleaved = c;
  return ih(a, d);
}
function ih(a, b) {
  a.lanes |= b;
  var c = a.alternate;
  null !== c && (c.lanes |= b);
  c = a;
  for (a = a.return; null !== a; ) a.childLanes |= b, c = a.alternate, null !== c && (c.childLanes |= b), c = a, a = a.return;
  return 3 === c.tag ? c.stateNode : null;
}
var jh = false;
function kh(a) {
  a.updateQueue = { baseState: a.memoizedState, firstBaseUpdate: null, lastBaseUpdate: null, shared: { pending: null, interleaved: null, lanes: 0 }, effects: null };
}
function lh(a, b) {
  a = a.updateQueue;
  b.updateQueue === a && (b.updateQueue = { baseState: a.baseState, firstBaseUpdate: a.firstBaseUpdate, lastBaseUpdate: a.lastBaseUpdate, shared: a.shared, effects: a.effects });
}
function mh(a, b) {
  return { eventTime: a, lane: b, tag: 0, payload: null, callback: null, next: null };
}
function nh(a, b, c) {
  var d = a.updateQueue;
  if (null === d) return null;
  d = d.shared;
  if (0 !== (K & 2)) {
    var e = d.pending;
    null === e ? b.next = b : (b.next = e.next, e.next = b);
    d.pending = b;
    return ih(a, c);
  }
  e = d.interleaved;
  null === e ? (b.next = b, gh(d)) : (b.next = e.next, e.next = b);
  d.interleaved = b;
  return ih(a, c);
}
function oh(a, b, c) {
  b = b.updateQueue;
  if (null !== b && (b = b.shared, 0 !== (c & 4194240))) {
    var d = b.lanes;
    d &= a.pendingLanes;
    c |= d;
    b.lanes = c;
    Cc(a, c);
  }
}
function ph(a, b) {
  var c = a.updateQueue, d = a.alternate;
  if (null !== d && (d = d.updateQueue, c === d)) {
    var e = null, f2 = null;
    c = c.firstBaseUpdate;
    if (null !== c) {
      do {
        var g = { eventTime: c.eventTime, lane: c.lane, tag: c.tag, payload: c.payload, callback: c.callback, next: null };
        null === f2 ? e = f2 = g : f2 = f2.next = g;
        c = c.next;
      } while (null !== c);
      null === f2 ? e = f2 = b : f2 = f2.next = b;
    } else e = f2 = b;
    c = { baseState: d.baseState, firstBaseUpdate: e, lastBaseUpdate: f2, shared: d.shared, effects: d.effects };
    a.updateQueue = c;
    return;
  }
  a = c.lastBaseUpdate;
  null === a ? c.firstBaseUpdate = b : a.next = b;
  c.lastBaseUpdate = b;
}
function qh(a, b, c, d) {
  var e = a.updateQueue;
  jh = false;
  var f2 = e.firstBaseUpdate, g = e.lastBaseUpdate, h = e.shared.pending;
  if (null !== h) {
    e.shared.pending = null;
    var k2 = h, l2 = k2.next;
    k2.next = null;
    null === g ? f2 = l2 : g.next = l2;
    g = k2;
    var m2 = a.alternate;
    null !== m2 && (m2 = m2.updateQueue, h = m2.lastBaseUpdate, h !== g && (null === h ? m2.firstBaseUpdate = l2 : h.next = l2, m2.lastBaseUpdate = k2));
  }
  if (null !== f2) {
    var q2 = e.baseState;
    g = 0;
    m2 = l2 = k2 = null;
    h = f2;
    do {
      var r2 = h.lane, y2 = h.eventTime;
      if ((d & r2) === r2) {
        null !== m2 && (m2 = m2.next = {
          eventTime: y2,
          lane: 0,
          tag: h.tag,
          payload: h.payload,
          callback: h.callback,
          next: null
        });
        a: {
          var n2 = a, t2 = h;
          r2 = b;
          y2 = c;
          switch (t2.tag) {
            case 1:
              n2 = t2.payload;
              if ("function" === typeof n2) {
                q2 = n2.call(y2, q2, r2);
                break a;
              }
              q2 = n2;
              break a;
            case 3:
              n2.flags = n2.flags & -65537 | 128;
            case 0:
              n2 = t2.payload;
              r2 = "function" === typeof n2 ? n2.call(y2, q2, r2) : n2;
              if (null === r2 || void 0 === r2) break a;
              q2 = A({}, q2, r2);
              break a;
            case 2:
              jh = true;
          }
        }
        null !== h.callback && 0 !== h.lane && (a.flags |= 64, r2 = e.effects, null === r2 ? e.effects = [h] : r2.push(h));
      } else y2 = { eventTime: y2, lane: r2, tag: h.tag, payload: h.payload, callback: h.callback, next: null }, null === m2 ? (l2 = m2 = y2, k2 = q2) : m2 = m2.next = y2, g |= r2;
      h = h.next;
      if (null === h) if (h = e.shared.pending, null === h) break;
      else r2 = h, h = r2.next, r2.next = null, e.lastBaseUpdate = r2, e.shared.pending = null;
    } while (1);
    null === m2 && (k2 = q2);
    e.baseState = k2;
    e.firstBaseUpdate = l2;
    e.lastBaseUpdate = m2;
    b = e.shared.interleaved;
    if (null !== b) {
      e = b;
      do
        g |= e.lane, e = e.next;
      while (e !== b);
    } else null === f2 && (e.shared.lanes = 0);
    rh |= g;
    a.lanes = g;
    a.memoizedState = q2;
  }
}
function sh(a, b, c) {
  a = b.effects;
  b.effects = null;
  if (null !== a) for (b = 0; b < a.length; b++) {
    var d = a[b], e = d.callback;
    if (null !== e) {
      d.callback = null;
      d = c;
      if ("function" !== typeof e) throw Error(p(191, e));
      e.call(d);
    }
  }
}
var th = {}, uh = Uf(th), vh = Uf(th), wh = Uf(th);
function xh(a) {
  if (a === th) throw Error(p(174));
  return a;
}
function yh(a, b) {
  G(wh, b);
  G(vh, a);
  G(uh, th);
  a = b.nodeType;
  switch (a) {
    case 9:
    case 11:
      b = (b = b.documentElement) ? b.namespaceURI : lb(null, "");
      break;
    default:
      a = 8 === a ? b.parentNode : b, b = a.namespaceURI || null, a = a.tagName, b = lb(b, a);
  }
  E(uh);
  G(uh, b);
}
function zh() {
  E(uh);
  E(vh);
  E(wh);
}
function Ah(a) {
  xh(wh.current);
  var b = xh(uh.current);
  var c = lb(b, a.type);
  b !== c && (G(vh, a), G(uh, c));
}
function Bh(a) {
  vh.current === a && (E(uh), E(vh));
}
var L = Uf(0);
function Ch(a) {
  for (var b = a; null !== b; ) {
    if (13 === b.tag) {
      var c = b.memoizedState;
      if (null !== c && (c = c.dehydrated, null === c || "$?" === c.data || "$!" === c.data)) return b;
    } else if (19 === b.tag && void 0 !== b.memoizedProps.revealOrder) {
      if (0 !== (b.flags & 128)) return b;
    } else if (null !== b.child) {
      b.child.return = b;
      b = b.child;
      continue;
    }
    if (b === a) break;
    for (; null === b.sibling; ) {
      if (null === b.return || b.return === a) return null;
      b = b.return;
    }
    b.sibling.return = b.return;
    b = b.sibling;
  }
  return null;
}
var Dh = [];
function Eh() {
  for (var a = 0; a < Dh.length; a++) Dh[a]._workInProgressVersionPrimary = null;
  Dh.length = 0;
}
var Fh = ua.ReactCurrentDispatcher, Gh = ua.ReactCurrentBatchConfig, Hh = 0, M = null, N = null, O = null, Ih = false, Jh = false, Kh = 0, Lh = 0;
function P() {
  throw Error(p(321));
}
function Mh(a, b) {
  if (null === b) return false;
  for (var c = 0; c < b.length && c < a.length; c++) if (!He(a[c], b[c])) return false;
  return true;
}
function Nh(a, b, c, d, e, f2) {
  Hh = f2;
  M = b;
  b.memoizedState = null;
  b.updateQueue = null;
  b.lanes = 0;
  Fh.current = null === a || null === a.memoizedState ? Oh : Ph;
  a = c(d, e);
  if (Jh) {
    f2 = 0;
    do {
      Jh = false;
      Kh = 0;
      if (25 <= f2) throw Error(p(301));
      f2 += 1;
      O = N = null;
      b.updateQueue = null;
      Fh.current = Qh;
      a = c(d, e);
    } while (Jh);
  }
  Fh.current = Rh;
  b = null !== N && null !== N.next;
  Hh = 0;
  O = N = M = null;
  Ih = false;
  if (b) throw Error(p(300));
  return a;
}
function Sh() {
  var a = 0 !== Kh;
  Kh = 0;
  return a;
}
function Th() {
  var a = { memoizedState: null, baseState: null, baseQueue: null, queue: null, next: null };
  null === O ? M.memoizedState = O = a : O = O.next = a;
  return O;
}
function Uh() {
  if (null === N) {
    var a = M.alternate;
    a = null !== a ? a.memoizedState : null;
  } else a = N.next;
  var b = null === O ? M.memoizedState : O.next;
  if (null !== b) O = b, N = a;
  else {
    if (null === a) throw Error(p(310));
    N = a;
    a = { memoizedState: N.memoizedState, baseState: N.baseState, baseQueue: N.baseQueue, queue: N.queue, next: null };
    null === O ? M.memoizedState = O = a : O = O.next = a;
  }
  return O;
}
function Vh(a, b) {
  return "function" === typeof b ? b(a) : b;
}
function Wh(a) {
  var b = Uh(), c = b.queue;
  if (null === c) throw Error(p(311));
  c.lastRenderedReducer = a;
  var d = N, e = d.baseQueue, f2 = c.pending;
  if (null !== f2) {
    if (null !== e) {
      var g = e.next;
      e.next = f2.next;
      f2.next = g;
    }
    d.baseQueue = e = f2;
    c.pending = null;
  }
  if (null !== e) {
    f2 = e.next;
    d = d.baseState;
    var h = g = null, k2 = null, l2 = f2;
    do {
      var m2 = l2.lane;
      if ((Hh & m2) === m2) null !== k2 && (k2 = k2.next = { lane: 0, action: l2.action, hasEagerState: l2.hasEagerState, eagerState: l2.eagerState, next: null }), d = l2.hasEagerState ? l2.eagerState : a(d, l2.action);
      else {
        var q2 = {
          lane: m2,
          action: l2.action,
          hasEagerState: l2.hasEagerState,
          eagerState: l2.eagerState,
          next: null
        };
        null === k2 ? (h = k2 = q2, g = d) : k2 = k2.next = q2;
        M.lanes |= m2;
        rh |= m2;
      }
      l2 = l2.next;
    } while (null !== l2 && l2 !== f2);
    null === k2 ? g = d : k2.next = h;
    He(d, b.memoizedState) || (dh = true);
    b.memoizedState = d;
    b.baseState = g;
    b.baseQueue = k2;
    c.lastRenderedState = d;
  }
  a = c.interleaved;
  if (null !== a) {
    e = a;
    do
      f2 = e.lane, M.lanes |= f2, rh |= f2, e = e.next;
    while (e !== a);
  } else null === e && (c.lanes = 0);
  return [b.memoizedState, c.dispatch];
}
function Xh(a) {
  var b = Uh(), c = b.queue;
  if (null === c) throw Error(p(311));
  c.lastRenderedReducer = a;
  var d = c.dispatch, e = c.pending, f2 = b.memoizedState;
  if (null !== e) {
    c.pending = null;
    var g = e = e.next;
    do
      f2 = a(f2, g.action), g = g.next;
    while (g !== e);
    He(f2, b.memoizedState) || (dh = true);
    b.memoizedState = f2;
    null === b.baseQueue && (b.baseState = f2);
    c.lastRenderedState = f2;
  }
  return [f2, d];
}
function Yh() {
}
function Zh(a, b) {
  var c = M, d = Uh(), e = b(), f2 = !He(d.memoizedState, e);
  f2 && (d.memoizedState = e, dh = true);
  d = d.queue;
  $h(ai.bind(null, c, d, a), [a]);
  if (d.getSnapshot !== b || f2 || null !== O && O.memoizedState.tag & 1) {
    c.flags |= 2048;
    bi(9, ci.bind(null, c, d, e, b), void 0, null);
    if (null === Q) throw Error(p(349));
    0 !== (Hh & 30) || di(c, b, e);
  }
  return e;
}
function di(a, b, c) {
  a.flags |= 16384;
  a = { getSnapshot: b, value: c };
  b = M.updateQueue;
  null === b ? (b = { lastEffect: null, stores: null }, M.updateQueue = b, b.stores = [a]) : (c = b.stores, null === c ? b.stores = [a] : c.push(a));
}
function ci(a, b, c, d) {
  b.value = c;
  b.getSnapshot = d;
  ei(b) && fi(a);
}
function ai(a, b, c) {
  return c(function() {
    ei(b) && fi(a);
  });
}
function ei(a) {
  var b = a.getSnapshot;
  a = a.value;
  try {
    var c = b();
    return !He(a, c);
  } catch (d) {
    return true;
  }
}
function fi(a) {
  var b = ih(a, 1);
  null !== b && gi(b, a, 1, -1);
}
function hi(a) {
  var b = Th();
  "function" === typeof a && (a = a());
  b.memoizedState = b.baseState = a;
  a = { pending: null, interleaved: null, lanes: 0, dispatch: null, lastRenderedReducer: Vh, lastRenderedState: a };
  b.queue = a;
  a = a.dispatch = ii.bind(null, M, a);
  return [b.memoizedState, a];
}
function bi(a, b, c, d) {
  a = { tag: a, create: b, destroy: c, deps: d, next: null };
  b = M.updateQueue;
  null === b ? (b = { lastEffect: null, stores: null }, M.updateQueue = b, b.lastEffect = a.next = a) : (c = b.lastEffect, null === c ? b.lastEffect = a.next = a : (d = c.next, c.next = a, a.next = d, b.lastEffect = a));
  return a;
}
function ji() {
  return Uh().memoizedState;
}
function ki(a, b, c, d) {
  var e = Th();
  M.flags |= a;
  e.memoizedState = bi(1 | b, c, void 0, void 0 === d ? null : d);
}
function li(a, b, c, d) {
  var e = Uh();
  d = void 0 === d ? null : d;
  var f2 = void 0;
  if (null !== N) {
    var g = N.memoizedState;
    f2 = g.destroy;
    if (null !== d && Mh(d, g.deps)) {
      e.memoizedState = bi(b, c, f2, d);
      return;
    }
  }
  M.flags |= a;
  e.memoizedState = bi(1 | b, c, f2, d);
}
function mi(a, b) {
  return ki(8390656, 8, a, b);
}
function $h(a, b) {
  return li(2048, 8, a, b);
}
function ni(a, b) {
  return li(4, 2, a, b);
}
function oi(a, b) {
  return li(4, 4, a, b);
}
function pi(a, b) {
  if ("function" === typeof b) return a = a(), b(a), function() {
    b(null);
  };
  if (null !== b && void 0 !== b) return a = a(), b.current = a, function() {
    b.current = null;
  };
}
function qi(a, b, c) {
  c = null !== c && void 0 !== c ? c.concat([a]) : null;
  return li(4, 4, pi.bind(null, b, a), c);
}
function ri() {
}
function si(a, b) {
  var c = Uh();
  b = void 0 === b ? null : b;
  var d = c.memoizedState;
  if (null !== d && null !== b && Mh(b, d[1])) return d[0];
  c.memoizedState = [a, b];
  return a;
}
function ti(a, b) {
  var c = Uh();
  b = void 0 === b ? null : b;
  var d = c.memoizedState;
  if (null !== d && null !== b && Mh(b, d[1])) return d[0];
  a = a();
  c.memoizedState = [a, b];
  return a;
}
function ui(a, b, c) {
  if (0 === (Hh & 21)) return a.baseState && (a.baseState = false, dh = true), a.memoizedState = c;
  He(c, b) || (c = yc(), M.lanes |= c, rh |= c, a.baseState = true);
  return b;
}
function vi(a, b) {
  var c = C;
  C = 0 !== c && 4 > c ? c : 4;
  a(true);
  var d = Gh.transition;
  Gh.transition = {};
  try {
    a(false), b();
  } finally {
    C = c, Gh.transition = d;
  }
}
function wi() {
  return Uh().memoizedState;
}
function xi(a, b, c) {
  var d = yi(a);
  c = { lane: d, action: c, hasEagerState: false, eagerState: null, next: null };
  if (zi(a)) Ai(b, c);
  else if (c = hh(a, b, c, d), null !== c) {
    var e = R();
    gi(c, a, d, e);
    Bi(c, b, d);
  }
}
function ii(a, b, c) {
  var d = yi(a), e = { lane: d, action: c, hasEagerState: false, eagerState: null, next: null };
  if (zi(a)) Ai(b, e);
  else {
    var f2 = a.alternate;
    if (0 === a.lanes && (null === f2 || 0 === f2.lanes) && (f2 = b.lastRenderedReducer, null !== f2)) try {
      var g = b.lastRenderedState, h = f2(g, c);
      e.hasEagerState = true;
      e.eagerState = h;
      if (He(h, g)) {
        var k2 = b.interleaved;
        null === k2 ? (e.next = e, gh(b)) : (e.next = k2.next, k2.next = e);
        b.interleaved = e;
        return;
      }
    } catch (l2) {
    } finally {
    }
    c = hh(a, b, e, d);
    null !== c && (e = R(), gi(c, a, d, e), Bi(c, b, d));
  }
}
function zi(a) {
  var b = a.alternate;
  return a === M || null !== b && b === M;
}
function Ai(a, b) {
  Jh = Ih = true;
  var c = a.pending;
  null === c ? b.next = b : (b.next = c.next, c.next = b);
  a.pending = b;
}
function Bi(a, b, c) {
  if (0 !== (c & 4194240)) {
    var d = b.lanes;
    d &= a.pendingLanes;
    c |= d;
    b.lanes = c;
    Cc(a, c);
  }
}
var Rh = { readContext: eh, useCallback: P, useContext: P, useEffect: P, useImperativeHandle: P, useInsertionEffect: P, useLayoutEffect: P, useMemo: P, useReducer: P, useRef: P, useState: P, useDebugValue: P, useDeferredValue: P, useTransition: P, useMutableSource: P, useSyncExternalStore: P, useId: P, unstable_isNewReconciler: false }, Oh = { readContext: eh, useCallback: function(a, b) {
  Th().memoizedState = [a, void 0 === b ? null : b];
  return a;
}, useContext: eh, useEffect: mi, useImperativeHandle: function(a, b, c) {
  c = null !== c && void 0 !== c ? c.concat([a]) : null;
  return ki(
    4194308,
    4,
    pi.bind(null, b, a),
    c
  );
}, useLayoutEffect: function(a, b) {
  return ki(4194308, 4, a, b);
}, useInsertionEffect: function(a, b) {
  return ki(4, 2, a, b);
}, useMemo: function(a, b) {
  var c = Th();
  b = void 0 === b ? null : b;
  a = a();
  c.memoizedState = [a, b];
  return a;
}, useReducer: function(a, b, c) {
  var d = Th();
  b = void 0 !== c ? c(b) : b;
  d.memoizedState = d.baseState = b;
  a = { pending: null, interleaved: null, lanes: 0, dispatch: null, lastRenderedReducer: a, lastRenderedState: b };
  d.queue = a;
  a = a.dispatch = xi.bind(null, M, a);
  return [d.memoizedState, a];
}, useRef: function(a) {
  var b = Th();
  a = { current: a };
  return b.memoizedState = a;
}, useState: hi, useDebugValue: ri, useDeferredValue: function(a) {
  return Th().memoizedState = a;
}, useTransition: function() {
  var a = hi(false), b = a[0];
  a = vi.bind(null, a[1]);
  Th().memoizedState = a;
  return [b, a];
}, useMutableSource: function() {
}, useSyncExternalStore: function(a, b, c) {
  var d = M, e = Th();
  if (I) {
    if (void 0 === c) throw Error(p(407));
    c = c();
  } else {
    c = b();
    if (null === Q) throw Error(p(349));
    0 !== (Hh & 30) || di(d, b, c);
  }
  e.memoizedState = c;
  var f2 = { value: c, getSnapshot: b };
  e.queue = f2;
  mi(ai.bind(
    null,
    d,
    f2,
    a
  ), [a]);
  d.flags |= 2048;
  bi(9, ci.bind(null, d, f2, c, b), void 0, null);
  return c;
}, useId: function() {
  var a = Th(), b = Q.identifierPrefix;
  if (I) {
    var c = sg;
    var d = rg;
    c = (d & ~(1 << 32 - oc(d) - 1)).toString(32) + c;
    b = ":" + b + "R" + c;
    c = Kh++;
    0 < c && (b += "H" + c.toString(32));
    b += ":";
  } else c = Lh++, b = ":" + b + "r" + c.toString(32) + ":";
  return a.memoizedState = b;
}, unstable_isNewReconciler: false }, Ph = {
  readContext: eh,
  useCallback: si,
  useContext: eh,
  useEffect: $h,
  useImperativeHandle: qi,
  useInsertionEffect: ni,
  useLayoutEffect: oi,
  useMemo: ti,
  useReducer: Wh,
  useRef: ji,
  useState: function() {
    return Wh(Vh);
  },
  useDebugValue: ri,
  useDeferredValue: function(a) {
    var b = Uh();
    return ui(b, N.memoizedState, a);
  },
  useTransition: function() {
    var a = Wh(Vh)[0], b = Uh().memoizedState;
    return [a, b];
  },
  useMutableSource: Yh,
  useSyncExternalStore: Zh,
  useId: wi,
  unstable_isNewReconciler: false
}, Qh = { readContext: eh, useCallback: si, useContext: eh, useEffect: $h, useImperativeHandle: qi, useInsertionEffect: ni, useLayoutEffect: oi, useMemo: ti, useReducer: Xh, useRef: ji, useState: function() {
  return Xh(Vh);
}, useDebugValue: ri, useDeferredValue: function(a) {
  var b = Uh();
  return null === N ? b.memoizedState = a : ui(b, N.memoizedState, a);
}, useTransition: function() {
  var a = Xh(Vh)[0], b = Uh().memoizedState;
  return [a, b];
}, useMutableSource: Yh, useSyncExternalStore: Zh, useId: wi, unstable_isNewReconciler: false };
function Ci(a, b) {
  if (a && a.defaultProps) {
    b = A({}, b);
    a = a.defaultProps;
    for (var c in a) void 0 === b[c] && (b[c] = a[c]);
    return b;
  }
  return b;
}
function Di(a, b, c, d) {
  b = a.memoizedState;
  c = c(d, b);
  c = null === c || void 0 === c ? b : A({}, b, c);
  a.memoizedState = c;
  0 === a.lanes && (a.updateQueue.baseState = c);
}
var Ei = { isMounted: function(a) {
  return (a = a._reactInternals) ? Vb(a) === a : false;
}, enqueueSetState: function(a, b, c) {
  a = a._reactInternals;
  var d = R(), e = yi(a), f2 = mh(d, e);
  f2.payload = b;
  void 0 !== c && null !== c && (f2.callback = c);
  b = nh(a, f2, e);
  null !== b && (gi(b, a, e, d), oh(b, a, e));
}, enqueueReplaceState: function(a, b, c) {
  a = a._reactInternals;
  var d = R(), e = yi(a), f2 = mh(d, e);
  f2.tag = 1;
  f2.payload = b;
  void 0 !== c && null !== c && (f2.callback = c);
  b = nh(a, f2, e);
  null !== b && (gi(b, a, e, d), oh(b, a, e));
}, enqueueForceUpdate: function(a, b) {
  a = a._reactInternals;
  var c = R(), d = yi(a), e = mh(c, d);
  e.tag = 2;
  void 0 !== b && null !== b && (e.callback = b);
  b = nh(a, e, d);
  null !== b && (gi(b, a, d, c), oh(b, a, d));
} };
function Fi(a, b, c, d, e, f2, g) {
  a = a.stateNode;
  return "function" === typeof a.shouldComponentUpdate ? a.shouldComponentUpdate(d, f2, g) : b.prototype && b.prototype.isPureReactComponent ? !Ie(c, d) || !Ie(e, f2) : true;
}
function Gi(a, b, c) {
  var d = false, e = Vf;
  var f2 = b.contextType;
  "object" === typeof f2 && null !== f2 ? f2 = eh(f2) : (e = Zf(b) ? Xf : H.current, d = b.contextTypes, f2 = (d = null !== d && void 0 !== d) ? Yf(a, e) : Vf);
  b = new b(c, f2);
  a.memoizedState = null !== b.state && void 0 !== b.state ? b.state : null;
  b.updater = Ei;
  a.stateNode = b;
  b._reactInternals = a;
  d && (a = a.stateNode, a.__reactInternalMemoizedUnmaskedChildContext = e, a.__reactInternalMemoizedMaskedChildContext = f2);
  return b;
}
function Hi(a, b, c, d) {
  a = b.state;
  "function" === typeof b.componentWillReceiveProps && b.componentWillReceiveProps(c, d);
  "function" === typeof b.UNSAFE_componentWillReceiveProps && b.UNSAFE_componentWillReceiveProps(c, d);
  b.state !== a && Ei.enqueueReplaceState(b, b.state, null);
}
function Ii(a, b, c, d) {
  var e = a.stateNode;
  e.props = c;
  e.state = a.memoizedState;
  e.refs = {};
  kh(a);
  var f2 = b.contextType;
  "object" === typeof f2 && null !== f2 ? e.context = eh(f2) : (f2 = Zf(b) ? Xf : H.current, e.context = Yf(a, f2));
  e.state = a.memoizedState;
  f2 = b.getDerivedStateFromProps;
  "function" === typeof f2 && (Di(a, b, f2, c), e.state = a.memoizedState);
  "function" === typeof b.getDerivedStateFromProps || "function" === typeof e.getSnapshotBeforeUpdate || "function" !== typeof e.UNSAFE_componentWillMount && "function" !== typeof e.componentWillMount || (b = e.state, "function" === typeof e.componentWillMount && e.componentWillMount(), "function" === typeof e.UNSAFE_componentWillMount && e.UNSAFE_componentWillMount(), b !== e.state && Ei.enqueueReplaceState(e, e.state, null), qh(a, c, e, d), e.state = a.memoizedState);
  "function" === typeof e.componentDidMount && (a.flags |= 4194308);
}
function Ji(a, b) {
  try {
    var c = "", d = b;
    do
      c += Pa(d), d = d.return;
    while (d);
    var e = c;
  } catch (f2) {
    e = "\nError generating stack: " + f2.message + "\n" + f2.stack;
  }
  return { value: a, source: b, stack: e, digest: null };
}
function Ki(a, b, c) {
  return { value: a, source: null, stack: null != c ? c : null, digest: null != b ? b : null };
}
function Li(a, b) {
  try {
    console.error(b.value);
  } catch (c) {
    setTimeout(function() {
      throw c;
    });
  }
}
var Mi = "function" === typeof WeakMap ? WeakMap : Map;
function Ni(a, b, c) {
  c = mh(-1, c);
  c.tag = 3;
  c.payload = { element: null };
  var d = b.value;
  c.callback = function() {
    Oi || (Oi = true, Pi = d);
    Li(a, b);
  };
  return c;
}
function Qi(a, b, c) {
  c = mh(-1, c);
  c.tag = 3;
  var d = a.type.getDerivedStateFromError;
  if ("function" === typeof d) {
    var e = b.value;
    c.payload = function() {
      return d(e);
    };
    c.callback = function() {
      Li(a, b);
    };
  }
  var f2 = a.stateNode;
  null !== f2 && "function" === typeof f2.componentDidCatch && (c.callback = function() {
    Li(a, b);
    "function" !== typeof d && (null === Ri ? Ri = /* @__PURE__ */ new Set([this]) : Ri.add(this));
    var c2 = b.stack;
    this.componentDidCatch(b.value, { componentStack: null !== c2 ? c2 : "" });
  });
  return c;
}
function Si(a, b, c) {
  var d = a.pingCache;
  if (null === d) {
    d = a.pingCache = new Mi();
    var e = /* @__PURE__ */ new Set();
    d.set(b, e);
  } else e = d.get(b), void 0 === e && (e = /* @__PURE__ */ new Set(), d.set(b, e));
  e.has(c) || (e.add(c), a = Ti.bind(null, a, b, c), b.then(a, a));
}
function Ui(a) {
  do {
    var b;
    if (b = 13 === a.tag) b = a.memoizedState, b = null !== b ? null !== b.dehydrated ? true : false : true;
    if (b) return a;
    a = a.return;
  } while (null !== a);
  return null;
}
function Vi(a, b, c, d, e) {
  if (0 === (a.mode & 1)) return a === b ? a.flags |= 65536 : (a.flags |= 128, c.flags |= 131072, c.flags &= -52805, 1 === c.tag && (null === c.alternate ? c.tag = 17 : (b = mh(-1, 1), b.tag = 2, nh(c, b, 1))), c.lanes |= 1), a;
  a.flags |= 65536;
  a.lanes = e;
  return a;
}
var Wi = ua.ReactCurrentOwner, dh = false;
function Xi(a, b, c, d) {
  b.child = null === a ? Vg(b, null, c, d) : Ug(b, a.child, c, d);
}
function Yi(a, b, c, d, e) {
  c = c.render;
  var f2 = b.ref;
  ch(b, e);
  d = Nh(a, b, c, d, f2, e);
  c = Sh();
  if (null !== a && !dh) return b.updateQueue = a.updateQueue, b.flags &= -2053, a.lanes &= ~e, Zi(a, b, e);
  I && c && vg(b);
  b.flags |= 1;
  Xi(a, b, d, e);
  return b.child;
}
function $i(a, b, c, d, e) {
  if (null === a) {
    var f2 = c.type;
    if ("function" === typeof f2 && !aj(f2) && void 0 === f2.defaultProps && null === c.compare && void 0 === c.defaultProps) return b.tag = 15, b.type = f2, bj(a, b, f2, d, e);
    a = Rg(c.type, null, d, b, b.mode, e);
    a.ref = b.ref;
    a.return = b;
    return b.child = a;
  }
  f2 = a.child;
  if (0 === (a.lanes & e)) {
    var g = f2.memoizedProps;
    c = c.compare;
    c = null !== c ? c : Ie;
    if (c(g, d) && a.ref === b.ref) return Zi(a, b, e);
  }
  b.flags |= 1;
  a = Pg(f2, d);
  a.ref = b.ref;
  a.return = b;
  return b.child = a;
}
function bj(a, b, c, d, e) {
  if (null !== a) {
    var f2 = a.memoizedProps;
    if (Ie(f2, d) && a.ref === b.ref) if (dh = false, b.pendingProps = d = f2, 0 !== (a.lanes & e)) 0 !== (a.flags & 131072) && (dh = true);
    else return b.lanes = a.lanes, Zi(a, b, e);
  }
  return cj(a, b, c, d, e);
}
function dj(a, b, c) {
  var d = b.pendingProps, e = d.children, f2 = null !== a ? a.memoizedState : null;
  if ("hidden" === d.mode) if (0 === (b.mode & 1)) b.memoizedState = { baseLanes: 0, cachePool: null, transitions: null }, G(ej, fj), fj |= c;
  else {
    if (0 === (c & 1073741824)) return a = null !== f2 ? f2.baseLanes | c : c, b.lanes = b.childLanes = 1073741824, b.memoizedState = { baseLanes: a, cachePool: null, transitions: null }, b.updateQueue = null, G(ej, fj), fj |= a, null;
    b.memoizedState = { baseLanes: 0, cachePool: null, transitions: null };
    d = null !== f2 ? f2.baseLanes : c;
    G(ej, fj);
    fj |= d;
  }
  else null !== f2 ? (d = f2.baseLanes | c, b.memoizedState = null) : d = c, G(ej, fj), fj |= d;
  Xi(a, b, e, c);
  return b.child;
}
function gj(a, b) {
  var c = b.ref;
  if (null === a && null !== c || null !== a && a.ref !== c) b.flags |= 512, b.flags |= 2097152;
}
function cj(a, b, c, d, e) {
  var f2 = Zf(c) ? Xf : H.current;
  f2 = Yf(b, f2);
  ch(b, e);
  c = Nh(a, b, c, d, f2, e);
  d = Sh();
  if (null !== a && !dh) return b.updateQueue = a.updateQueue, b.flags &= -2053, a.lanes &= ~e, Zi(a, b, e);
  I && d && vg(b);
  b.flags |= 1;
  Xi(a, b, c, e);
  return b.child;
}
function hj(a, b, c, d, e) {
  if (Zf(c)) {
    var f2 = true;
    cg(b);
  } else f2 = false;
  ch(b, e);
  if (null === b.stateNode) ij(a, b), Gi(b, c, d), Ii(b, c, d, e), d = true;
  else if (null === a) {
    var g = b.stateNode, h = b.memoizedProps;
    g.props = h;
    var k2 = g.context, l2 = c.contextType;
    "object" === typeof l2 && null !== l2 ? l2 = eh(l2) : (l2 = Zf(c) ? Xf : H.current, l2 = Yf(b, l2));
    var m2 = c.getDerivedStateFromProps, q2 = "function" === typeof m2 || "function" === typeof g.getSnapshotBeforeUpdate;
    q2 || "function" !== typeof g.UNSAFE_componentWillReceiveProps && "function" !== typeof g.componentWillReceiveProps || (h !== d || k2 !== l2) && Hi(b, g, d, l2);
    jh = false;
    var r2 = b.memoizedState;
    g.state = r2;
    qh(b, d, g, e);
    k2 = b.memoizedState;
    h !== d || r2 !== k2 || Wf.current || jh ? ("function" === typeof m2 && (Di(b, c, m2, d), k2 = b.memoizedState), (h = jh || Fi(b, c, h, d, r2, k2, l2)) ? (q2 || "function" !== typeof g.UNSAFE_componentWillMount && "function" !== typeof g.componentWillMount || ("function" === typeof g.componentWillMount && g.componentWillMount(), "function" === typeof g.UNSAFE_componentWillMount && g.UNSAFE_componentWillMount()), "function" === typeof g.componentDidMount && (b.flags |= 4194308)) : ("function" === typeof g.componentDidMount && (b.flags |= 4194308), b.memoizedProps = d, b.memoizedState = k2), g.props = d, g.state = k2, g.context = l2, d = h) : ("function" === typeof g.componentDidMount && (b.flags |= 4194308), d = false);
  } else {
    g = b.stateNode;
    lh(a, b);
    h = b.memoizedProps;
    l2 = b.type === b.elementType ? h : Ci(b.type, h);
    g.props = l2;
    q2 = b.pendingProps;
    r2 = g.context;
    k2 = c.contextType;
    "object" === typeof k2 && null !== k2 ? k2 = eh(k2) : (k2 = Zf(c) ? Xf : H.current, k2 = Yf(b, k2));
    var y2 = c.getDerivedStateFromProps;
    (m2 = "function" === typeof y2 || "function" === typeof g.getSnapshotBeforeUpdate) || "function" !== typeof g.UNSAFE_componentWillReceiveProps && "function" !== typeof g.componentWillReceiveProps || (h !== q2 || r2 !== k2) && Hi(b, g, d, k2);
    jh = false;
    r2 = b.memoizedState;
    g.state = r2;
    qh(b, d, g, e);
    var n2 = b.memoizedState;
    h !== q2 || r2 !== n2 || Wf.current || jh ? ("function" === typeof y2 && (Di(b, c, y2, d), n2 = b.memoizedState), (l2 = jh || Fi(b, c, l2, d, r2, n2, k2) || false) ? (m2 || "function" !== typeof g.UNSAFE_componentWillUpdate && "function" !== typeof g.componentWillUpdate || ("function" === typeof g.componentWillUpdate && g.componentWillUpdate(d, n2, k2), "function" === typeof g.UNSAFE_componentWillUpdate && g.UNSAFE_componentWillUpdate(d, n2, k2)), "function" === typeof g.componentDidUpdate && (b.flags |= 4), "function" === typeof g.getSnapshotBeforeUpdate && (b.flags |= 1024)) : ("function" !== typeof g.componentDidUpdate || h === a.memoizedProps && r2 === a.memoizedState || (b.flags |= 4), "function" !== typeof g.getSnapshotBeforeUpdate || h === a.memoizedProps && r2 === a.memoizedState || (b.flags |= 1024), b.memoizedProps = d, b.memoizedState = n2), g.props = d, g.state = n2, g.context = k2, d = l2) : ("function" !== typeof g.componentDidUpdate || h === a.memoizedProps && r2 === a.memoizedState || (b.flags |= 4), "function" !== typeof g.getSnapshotBeforeUpdate || h === a.memoizedProps && r2 === a.memoizedState || (b.flags |= 1024), d = false);
  }
  return jj(a, b, c, d, f2, e);
}
function jj(a, b, c, d, e, f2) {
  gj(a, b);
  var g = 0 !== (b.flags & 128);
  if (!d && !g) return e && dg(b, c, false), Zi(a, b, f2);
  d = b.stateNode;
  Wi.current = b;
  var h = g && "function" !== typeof c.getDerivedStateFromError ? null : d.render();
  b.flags |= 1;
  null !== a && g ? (b.child = Ug(b, a.child, null, f2), b.child = Ug(b, null, h, f2)) : Xi(a, b, h, f2);
  b.memoizedState = d.state;
  e && dg(b, c, true);
  return b.child;
}
function kj(a) {
  var b = a.stateNode;
  b.pendingContext ? ag(a, b.pendingContext, b.pendingContext !== b.context) : b.context && ag(a, b.context, false);
  yh(a, b.containerInfo);
}
function lj(a, b, c, d, e) {
  Ig();
  Jg(e);
  b.flags |= 256;
  Xi(a, b, c, d);
  return b.child;
}
var mj = { dehydrated: null, treeContext: null, retryLane: 0 };
function nj(a) {
  return { baseLanes: a, cachePool: null, transitions: null };
}
function oj(a, b, c) {
  var d = b.pendingProps, e = L.current, f2 = false, g = 0 !== (b.flags & 128), h;
  (h = g) || (h = null !== a && null === a.memoizedState ? false : 0 !== (e & 2));
  if (h) f2 = true, b.flags &= -129;
  else if (null === a || null !== a.memoizedState) e |= 1;
  G(L, e & 1);
  if (null === a) {
    Eg(b);
    a = b.memoizedState;
    if (null !== a && (a = a.dehydrated, null !== a)) return 0 === (b.mode & 1) ? b.lanes = 1 : "$!" === a.data ? b.lanes = 8 : b.lanes = 1073741824, null;
    g = d.children;
    a = d.fallback;
    return f2 ? (d = b.mode, f2 = b.child, g = { mode: "hidden", children: g }, 0 === (d & 1) && null !== f2 ? (f2.childLanes = 0, f2.pendingProps = g) : f2 = pj(g, d, 0, null), a = Tg(a, d, c, null), f2.return = b, a.return = b, f2.sibling = a, b.child = f2, b.child.memoizedState = nj(c), b.memoizedState = mj, a) : qj(b, g);
  }
  e = a.memoizedState;
  if (null !== e && (h = e.dehydrated, null !== h)) return rj(a, b, g, d, h, e, c);
  if (f2) {
    f2 = d.fallback;
    g = b.mode;
    e = a.child;
    h = e.sibling;
    var k2 = { mode: "hidden", children: d.children };
    0 === (g & 1) && b.child !== e ? (d = b.child, d.childLanes = 0, d.pendingProps = k2, b.deletions = null) : (d = Pg(e, k2), d.subtreeFlags = e.subtreeFlags & 14680064);
    null !== h ? f2 = Pg(h, f2) : (f2 = Tg(f2, g, c, null), f2.flags |= 2);
    f2.return = b;
    d.return = b;
    d.sibling = f2;
    b.child = d;
    d = f2;
    f2 = b.child;
    g = a.child.memoizedState;
    g = null === g ? nj(c) : { baseLanes: g.baseLanes | c, cachePool: null, transitions: g.transitions };
    f2.memoizedState = g;
    f2.childLanes = a.childLanes & ~c;
    b.memoizedState = mj;
    return d;
  }
  f2 = a.child;
  a = f2.sibling;
  d = Pg(f2, { mode: "visible", children: d.children });
  0 === (b.mode & 1) && (d.lanes = c);
  d.return = b;
  d.sibling = null;
  null !== a && (c = b.deletions, null === c ? (b.deletions = [a], b.flags |= 16) : c.push(a));
  b.child = d;
  b.memoizedState = null;
  return d;
}
function qj(a, b) {
  b = pj({ mode: "visible", children: b }, a.mode, 0, null);
  b.return = a;
  return a.child = b;
}
function sj(a, b, c, d) {
  null !== d && Jg(d);
  Ug(b, a.child, null, c);
  a = qj(b, b.pendingProps.children);
  a.flags |= 2;
  b.memoizedState = null;
  return a;
}
function rj(a, b, c, d, e, f2, g) {
  if (c) {
    if (b.flags & 256) return b.flags &= -257, d = Ki(Error(p(422))), sj(a, b, g, d);
    if (null !== b.memoizedState) return b.child = a.child, b.flags |= 128, null;
    f2 = d.fallback;
    e = b.mode;
    d = pj({ mode: "visible", children: d.children }, e, 0, null);
    f2 = Tg(f2, e, g, null);
    f2.flags |= 2;
    d.return = b;
    f2.return = b;
    d.sibling = f2;
    b.child = d;
    0 !== (b.mode & 1) && Ug(b, a.child, null, g);
    b.child.memoizedState = nj(g);
    b.memoizedState = mj;
    return f2;
  }
  if (0 === (b.mode & 1)) return sj(a, b, g, null);
  if ("$!" === e.data) {
    d = e.nextSibling && e.nextSibling.dataset;
    if (d) var h = d.dgst;
    d = h;
    f2 = Error(p(419));
    d = Ki(f2, d, void 0);
    return sj(a, b, g, d);
  }
  h = 0 !== (g & a.childLanes);
  if (dh || h) {
    d = Q;
    if (null !== d) {
      switch (g & -g) {
        case 4:
          e = 2;
          break;
        case 16:
          e = 8;
          break;
        case 64:
        case 128:
        case 256:
        case 512:
        case 1024:
        case 2048:
        case 4096:
        case 8192:
        case 16384:
        case 32768:
        case 65536:
        case 131072:
        case 262144:
        case 524288:
        case 1048576:
        case 2097152:
        case 4194304:
        case 8388608:
        case 16777216:
        case 33554432:
        case 67108864:
          e = 32;
          break;
        case 536870912:
          e = 268435456;
          break;
        default:
          e = 0;
      }
      e = 0 !== (e & (d.suspendedLanes | g)) ? 0 : e;
      0 !== e && e !== f2.retryLane && (f2.retryLane = e, ih(a, e), gi(d, a, e, -1));
    }
    tj();
    d = Ki(Error(p(421)));
    return sj(a, b, g, d);
  }
  if ("$?" === e.data) return b.flags |= 128, b.child = a.child, b = uj.bind(null, a), e._reactRetry = b, null;
  a = f2.treeContext;
  yg = Lf(e.nextSibling);
  xg = b;
  I = true;
  zg = null;
  null !== a && (og[pg++] = rg, og[pg++] = sg, og[pg++] = qg, rg = a.id, sg = a.overflow, qg = b);
  b = qj(b, d.children);
  b.flags |= 4096;
  return b;
}
function vj(a, b, c) {
  a.lanes |= b;
  var d = a.alternate;
  null !== d && (d.lanes |= b);
  bh(a.return, b, c);
}
function wj(a, b, c, d, e) {
  var f2 = a.memoizedState;
  null === f2 ? a.memoizedState = { isBackwards: b, rendering: null, renderingStartTime: 0, last: d, tail: c, tailMode: e } : (f2.isBackwards = b, f2.rendering = null, f2.renderingStartTime = 0, f2.last = d, f2.tail = c, f2.tailMode = e);
}
function xj(a, b, c) {
  var d = b.pendingProps, e = d.revealOrder, f2 = d.tail;
  Xi(a, b, d.children, c);
  d = L.current;
  if (0 !== (d & 2)) d = d & 1 | 2, b.flags |= 128;
  else {
    if (null !== a && 0 !== (a.flags & 128)) a: for (a = b.child; null !== a; ) {
      if (13 === a.tag) null !== a.memoizedState && vj(a, c, b);
      else if (19 === a.tag) vj(a, c, b);
      else if (null !== a.child) {
        a.child.return = a;
        a = a.child;
        continue;
      }
      if (a === b) break a;
      for (; null === a.sibling; ) {
        if (null === a.return || a.return === b) break a;
        a = a.return;
      }
      a.sibling.return = a.return;
      a = a.sibling;
    }
    d &= 1;
  }
  G(L, d);
  if (0 === (b.mode & 1)) b.memoizedState = null;
  else switch (e) {
    case "forwards":
      c = b.child;
      for (e = null; null !== c; ) a = c.alternate, null !== a && null === Ch(a) && (e = c), c = c.sibling;
      c = e;
      null === c ? (e = b.child, b.child = null) : (e = c.sibling, c.sibling = null);
      wj(b, false, e, c, f2);
      break;
    case "backwards":
      c = null;
      e = b.child;
      for (b.child = null; null !== e; ) {
        a = e.alternate;
        if (null !== a && null === Ch(a)) {
          b.child = e;
          break;
        }
        a = e.sibling;
        e.sibling = c;
        c = e;
        e = a;
      }
      wj(b, true, c, null, f2);
      break;
    case "together":
      wj(b, false, null, null, void 0);
      break;
    default:
      b.memoizedState = null;
  }
  return b.child;
}
function ij(a, b) {
  0 === (b.mode & 1) && null !== a && (a.alternate = null, b.alternate = null, b.flags |= 2);
}
function Zi(a, b, c) {
  null !== a && (b.dependencies = a.dependencies);
  rh |= b.lanes;
  if (0 === (c & b.childLanes)) return null;
  if (null !== a && b.child !== a.child) throw Error(p(153));
  if (null !== b.child) {
    a = b.child;
    c = Pg(a, a.pendingProps);
    b.child = c;
    for (c.return = b; null !== a.sibling; ) a = a.sibling, c = c.sibling = Pg(a, a.pendingProps), c.return = b;
    c.sibling = null;
  }
  return b.child;
}
function yj(a, b, c) {
  switch (b.tag) {
    case 3:
      kj(b);
      Ig();
      break;
    case 5:
      Ah(b);
      break;
    case 1:
      Zf(b.type) && cg(b);
      break;
    case 4:
      yh(b, b.stateNode.containerInfo);
      break;
    case 10:
      var d = b.type._context, e = b.memoizedProps.value;
      G(Wg, d._currentValue);
      d._currentValue = e;
      break;
    case 13:
      d = b.memoizedState;
      if (null !== d) {
        if (null !== d.dehydrated) return G(L, L.current & 1), b.flags |= 128, null;
        if (0 !== (c & b.child.childLanes)) return oj(a, b, c);
        G(L, L.current & 1);
        a = Zi(a, b, c);
        return null !== a ? a.sibling : null;
      }
      G(L, L.current & 1);
      break;
    case 19:
      d = 0 !== (c & b.childLanes);
      if (0 !== (a.flags & 128)) {
        if (d) return xj(a, b, c);
        b.flags |= 128;
      }
      e = b.memoizedState;
      null !== e && (e.rendering = null, e.tail = null, e.lastEffect = null);
      G(L, L.current);
      if (d) break;
      else return null;
    case 22:
    case 23:
      return b.lanes = 0, dj(a, b, c);
  }
  return Zi(a, b, c);
}
var zj, Aj, Bj, Cj;
zj = function(a, b) {
  for (var c = b.child; null !== c; ) {
    if (5 === c.tag || 6 === c.tag) a.appendChild(c.stateNode);
    else if (4 !== c.tag && null !== c.child) {
      c.child.return = c;
      c = c.child;
      continue;
    }
    if (c === b) break;
    for (; null === c.sibling; ) {
      if (null === c.return || c.return === b) return;
      c = c.return;
    }
    c.sibling.return = c.return;
    c = c.sibling;
  }
};
Aj = function() {
};
Bj = function(a, b, c, d) {
  var e = a.memoizedProps;
  if (e !== d) {
    a = b.stateNode;
    xh(uh.current);
    var f2 = null;
    switch (c) {
      case "input":
        e = Ya(a, e);
        d = Ya(a, d);
        f2 = [];
        break;
      case "select":
        e = A({}, e, { value: void 0 });
        d = A({}, d, { value: void 0 });
        f2 = [];
        break;
      case "textarea":
        e = gb(a, e);
        d = gb(a, d);
        f2 = [];
        break;
      default:
        "function" !== typeof e.onClick && "function" === typeof d.onClick && (a.onclick = Bf);
    }
    ub(c, d);
    var g;
    c = null;
    for (l2 in e) if (!d.hasOwnProperty(l2) && e.hasOwnProperty(l2) && null != e[l2]) if ("style" === l2) {
      var h = e[l2];
      for (g in h) h.hasOwnProperty(g) && (c || (c = {}), c[g] = "");
    } else "dangerouslySetInnerHTML" !== l2 && "children" !== l2 && "suppressContentEditableWarning" !== l2 && "suppressHydrationWarning" !== l2 && "autoFocus" !== l2 && (ea.hasOwnProperty(l2) ? f2 || (f2 = []) : (f2 = f2 || []).push(l2, null));
    for (l2 in d) {
      var k2 = d[l2];
      h = null != e ? e[l2] : void 0;
      if (d.hasOwnProperty(l2) && k2 !== h && (null != k2 || null != h)) if ("style" === l2) if (h) {
        for (g in h) !h.hasOwnProperty(g) || k2 && k2.hasOwnProperty(g) || (c || (c = {}), c[g] = "");
        for (g in k2) k2.hasOwnProperty(g) && h[g] !== k2[g] && (c || (c = {}), c[g] = k2[g]);
      } else c || (f2 || (f2 = []), f2.push(
        l2,
        c
      )), c = k2;
      else "dangerouslySetInnerHTML" === l2 ? (k2 = k2 ? k2.__html : void 0, h = h ? h.__html : void 0, null != k2 && h !== k2 && (f2 = f2 || []).push(l2, k2)) : "children" === l2 ? "string" !== typeof k2 && "number" !== typeof k2 || (f2 = f2 || []).push(l2, "" + k2) : "suppressContentEditableWarning" !== l2 && "suppressHydrationWarning" !== l2 && (ea.hasOwnProperty(l2) ? (null != k2 && "onScroll" === l2 && D("scroll", a), f2 || h === k2 || (f2 = [])) : (f2 = f2 || []).push(l2, k2));
    }
    c && (f2 = f2 || []).push("style", c);
    var l2 = f2;
    if (b.updateQueue = l2) b.flags |= 4;
  }
};
Cj = function(a, b, c, d) {
  c !== d && (b.flags |= 4);
};
function Dj(a, b) {
  if (!I) switch (a.tailMode) {
    case "hidden":
      b = a.tail;
      for (var c = null; null !== b; ) null !== b.alternate && (c = b), b = b.sibling;
      null === c ? a.tail = null : c.sibling = null;
      break;
    case "collapsed":
      c = a.tail;
      for (var d = null; null !== c; ) null !== c.alternate && (d = c), c = c.sibling;
      null === d ? b || null === a.tail ? a.tail = null : a.tail.sibling = null : d.sibling = null;
  }
}
function S(a) {
  var b = null !== a.alternate && a.alternate.child === a.child, c = 0, d = 0;
  if (b) for (var e = a.child; null !== e; ) c |= e.lanes | e.childLanes, d |= e.subtreeFlags & 14680064, d |= e.flags & 14680064, e.return = a, e = e.sibling;
  else for (e = a.child; null !== e; ) c |= e.lanes | e.childLanes, d |= e.subtreeFlags, d |= e.flags, e.return = a, e = e.sibling;
  a.subtreeFlags |= d;
  a.childLanes = c;
  return b;
}
function Ej(a, b, c) {
  var d = b.pendingProps;
  wg(b);
  switch (b.tag) {
    case 2:
    case 16:
    case 15:
    case 0:
    case 11:
    case 7:
    case 8:
    case 12:
    case 9:
    case 14:
      return S(b), null;
    case 1:
      return Zf(b.type) && $f(), S(b), null;
    case 3:
      d = b.stateNode;
      zh();
      E(Wf);
      E(H);
      Eh();
      d.pendingContext && (d.context = d.pendingContext, d.pendingContext = null);
      if (null === a || null === a.child) Gg(b) ? b.flags |= 4 : null === a || a.memoizedState.isDehydrated && 0 === (b.flags & 256) || (b.flags |= 1024, null !== zg && (Fj(zg), zg = null));
      Aj(a, b);
      S(b);
      return null;
    case 5:
      Bh(b);
      var e = xh(wh.current);
      c = b.type;
      if (null !== a && null != b.stateNode) Bj(a, b, c, d, e), a.ref !== b.ref && (b.flags |= 512, b.flags |= 2097152);
      else {
        if (!d) {
          if (null === b.stateNode) throw Error(p(166));
          S(b);
          return null;
        }
        a = xh(uh.current);
        if (Gg(b)) {
          d = b.stateNode;
          c = b.type;
          var f2 = b.memoizedProps;
          d[Of] = b;
          d[Pf] = f2;
          a = 0 !== (b.mode & 1);
          switch (c) {
            case "dialog":
              D("cancel", d);
              D("close", d);
              break;
            case "iframe":
            case "object":
            case "embed":
              D("load", d);
              break;
            case "video":
            case "audio":
              for (e = 0; e < lf.length; e++) D(lf[e], d);
              break;
            case "source":
              D("error", d);
              break;
            case "img":
            case "image":
            case "link":
              D(
                "error",
                d
              );
              D("load", d);
              break;
            case "details":
              D("toggle", d);
              break;
            case "input":
              Za(d, f2);
              D("invalid", d);
              break;
            case "select":
              d._wrapperState = { wasMultiple: !!f2.multiple };
              D("invalid", d);
              break;
            case "textarea":
              hb(d, f2), D("invalid", d);
          }
          ub(c, f2);
          e = null;
          for (var g in f2) if (f2.hasOwnProperty(g)) {
            var h = f2[g];
            "children" === g ? "string" === typeof h ? d.textContent !== h && (true !== f2.suppressHydrationWarning && Af(d.textContent, h, a), e = ["children", h]) : "number" === typeof h && d.textContent !== "" + h && (true !== f2.suppressHydrationWarning && Af(
              d.textContent,
              h,
              a
            ), e = ["children", "" + h]) : ea.hasOwnProperty(g) && null != h && "onScroll" === g && D("scroll", d);
          }
          switch (c) {
            case "input":
              Va(d);
              db(d, f2, true);
              break;
            case "textarea":
              Va(d);
              jb(d);
              break;
            case "select":
            case "option":
              break;
            default:
              "function" === typeof f2.onClick && (d.onclick = Bf);
          }
          d = e;
          b.updateQueue = d;
          null !== d && (b.flags |= 4);
        } else {
          g = 9 === e.nodeType ? e : e.ownerDocument;
          "http://www.w3.org/1999/xhtml" === a && (a = kb(c));
          "http://www.w3.org/1999/xhtml" === a ? "script" === c ? (a = g.createElement("div"), a.innerHTML = "<script><\/script>", a = a.removeChild(a.firstChild)) : "string" === typeof d.is ? a = g.createElement(c, { is: d.is }) : (a = g.createElement(c), "select" === c && (g = a, d.multiple ? g.multiple = true : d.size && (g.size = d.size))) : a = g.createElementNS(a, c);
          a[Of] = b;
          a[Pf] = d;
          zj(a, b, false, false);
          b.stateNode = a;
          a: {
            g = vb(c, d);
            switch (c) {
              case "dialog":
                D("cancel", a);
                D("close", a);
                e = d;
                break;
              case "iframe":
              case "object":
              case "embed":
                D("load", a);
                e = d;
                break;
              case "video":
              case "audio":
                for (e = 0; e < lf.length; e++) D(lf[e], a);
                e = d;
                break;
              case "source":
                D("error", a);
                e = d;
                break;
              case "img":
              case "image":
              case "link":
                D(
                  "error",
                  a
                );
                D("load", a);
                e = d;
                break;
              case "details":
                D("toggle", a);
                e = d;
                break;
              case "input":
                Za(a, d);
                e = Ya(a, d);
                D("invalid", a);
                break;
              case "option":
                e = d;
                break;
              case "select":
                a._wrapperState = { wasMultiple: !!d.multiple };
                e = A({}, d, { value: void 0 });
                D("invalid", a);
                break;
              case "textarea":
                hb(a, d);
                e = gb(a, d);
                D("invalid", a);
                break;
              default:
                e = d;
            }
            ub(c, e);
            h = e;
            for (f2 in h) if (h.hasOwnProperty(f2)) {
              var k2 = h[f2];
              "style" === f2 ? sb(a, k2) : "dangerouslySetInnerHTML" === f2 ? (k2 = k2 ? k2.__html : void 0, null != k2 && nb(a, k2)) : "children" === f2 ? "string" === typeof k2 ? ("textarea" !== c || "" !== k2) && ob(a, k2) : "number" === typeof k2 && ob(a, "" + k2) : "suppressContentEditableWarning" !== f2 && "suppressHydrationWarning" !== f2 && "autoFocus" !== f2 && (ea.hasOwnProperty(f2) ? null != k2 && "onScroll" === f2 && D("scroll", a) : null != k2 && ta(a, f2, k2, g));
            }
            switch (c) {
              case "input":
                Va(a);
                db(a, d, false);
                break;
              case "textarea":
                Va(a);
                jb(a);
                break;
              case "option":
                null != d.value && a.setAttribute("value", "" + Sa(d.value));
                break;
              case "select":
                a.multiple = !!d.multiple;
                f2 = d.value;
                null != f2 ? fb(a, !!d.multiple, f2, false) : null != d.defaultValue && fb(
                  a,
                  !!d.multiple,
                  d.defaultValue,
                  true
                );
                break;
              default:
                "function" === typeof e.onClick && (a.onclick = Bf);
            }
            switch (c) {
              case "button":
              case "input":
              case "select":
              case "textarea":
                d = !!d.autoFocus;
                break a;
              case "img":
                d = true;
                break a;
              default:
                d = false;
            }
          }
          d && (b.flags |= 4);
        }
        null !== b.ref && (b.flags |= 512, b.flags |= 2097152);
      }
      S(b);
      return null;
    case 6:
      if (a && null != b.stateNode) Cj(a, b, a.memoizedProps, d);
      else {
        if ("string" !== typeof d && null === b.stateNode) throw Error(p(166));
        c = xh(wh.current);
        xh(uh.current);
        if (Gg(b)) {
          d = b.stateNode;
          c = b.memoizedProps;
          d[Of] = b;
          if (f2 = d.nodeValue !== c) {
            if (a = xg, null !== a) switch (a.tag) {
              case 3:
                Af(d.nodeValue, c, 0 !== (a.mode & 1));
                break;
              case 5:
                true !== a.memoizedProps.suppressHydrationWarning && Af(d.nodeValue, c, 0 !== (a.mode & 1));
            }
          }
          f2 && (b.flags |= 4);
        } else d = (9 === c.nodeType ? c : c.ownerDocument).createTextNode(d), d[Of] = b, b.stateNode = d;
      }
      S(b);
      return null;
    case 13:
      E(L);
      d = b.memoizedState;
      if (null === a || null !== a.memoizedState && null !== a.memoizedState.dehydrated) {
        if (I && null !== yg && 0 !== (b.mode & 1) && 0 === (b.flags & 128)) Hg(), Ig(), b.flags |= 98560, f2 = false;
        else if (f2 = Gg(b), null !== d && null !== d.dehydrated) {
          if (null === a) {
            if (!f2) throw Error(p(318));
            f2 = b.memoizedState;
            f2 = null !== f2 ? f2.dehydrated : null;
            if (!f2) throw Error(p(317));
            f2[Of] = b;
          } else Ig(), 0 === (b.flags & 128) && (b.memoizedState = null), b.flags |= 4;
          S(b);
          f2 = false;
        } else null !== zg && (Fj(zg), zg = null), f2 = true;
        if (!f2) return b.flags & 65536 ? b : null;
      }
      if (0 !== (b.flags & 128)) return b.lanes = c, b;
      d = null !== d;
      d !== (null !== a && null !== a.memoizedState) && d && (b.child.flags |= 8192, 0 !== (b.mode & 1) && (null === a || 0 !== (L.current & 1) ? 0 === T && (T = 3) : tj()));
      null !== b.updateQueue && (b.flags |= 4);
      S(b);
      return null;
    case 4:
      return zh(), Aj(a, b), null === a && sf(b.stateNode.containerInfo), S(b), null;
    case 10:
      return ah(b.type._context), S(b), null;
    case 17:
      return Zf(b.type) && $f(), S(b), null;
    case 19:
      E(L);
      f2 = b.memoizedState;
      if (null === f2) return S(b), null;
      d = 0 !== (b.flags & 128);
      g = f2.rendering;
      if (null === g) if (d) Dj(f2, false);
      else {
        if (0 !== T || null !== a && 0 !== (a.flags & 128)) for (a = b.child; null !== a; ) {
          g = Ch(a);
          if (null !== g) {
            b.flags |= 128;
            Dj(f2, false);
            d = g.updateQueue;
            null !== d && (b.updateQueue = d, b.flags |= 4);
            b.subtreeFlags = 0;
            d = c;
            for (c = b.child; null !== c; ) f2 = c, a = d, f2.flags &= 14680066, g = f2.alternate, null === g ? (f2.childLanes = 0, f2.lanes = a, f2.child = null, f2.subtreeFlags = 0, f2.memoizedProps = null, f2.memoizedState = null, f2.updateQueue = null, f2.dependencies = null, f2.stateNode = null) : (f2.childLanes = g.childLanes, f2.lanes = g.lanes, f2.child = g.child, f2.subtreeFlags = 0, f2.deletions = null, f2.memoizedProps = g.memoizedProps, f2.memoizedState = g.memoizedState, f2.updateQueue = g.updateQueue, f2.type = g.type, a = g.dependencies, f2.dependencies = null === a ? null : { lanes: a.lanes, firstContext: a.firstContext }), c = c.sibling;
            G(L, L.current & 1 | 2);
            return b.child;
          }
          a = a.sibling;
        }
        null !== f2.tail && B() > Gj && (b.flags |= 128, d = true, Dj(f2, false), b.lanes = 4194304);
      }
      else {
        if (!d) if (a = Ch(g), null !== a) {
          if (b.flags |= 128, d = true, c = a.updateQueue, null !== c && (b.updateQueue = c, b.flags |= 4), Dj(f2, true), null === f2.tail && "hidden" === f2.tailMode && !g.alternate && !I) return S(b), null;
        } else 2 * B() - f2.renderingStartTime > Gj && 1073741824 !== c && (b.flags |= 128, d = true, Dj(f2, false), b.lanes = 4194304);
        f2.isBackwards ? (g.sibling = b.child, b.child = g) : (c = f2.last, null !== c ? c.sibling = g : b.child = g, f2.last = g);
      }
      if (null !== f2.tail) return b = f2.tail, f2.rendering = b, f2.tail = b.sibling, f2.renderingStartTime = B(), b.sibling = null, c = L.current, G(L, d ? c & 1 | 2 : c & 1), b;
      S(b);
      return null;
    case 22:
    case 23:
      return Hj(), d = null !== b.memoizedState, null !== a && null !== a.memoizedState !== d && (b.flags |= 8192), d && 0 !== (b.mode & 1) ? 0 !== (fj & 1073741824) && (S(b), b.subtreeFlags & 6 && (b.flags |= 8192)) : S(b), null;
    case 24:
      return null;
    case 25:
      return null;
  }
  throw Error(p(156, b.tag));
}
function Ij(a, b) {
  wg(b);
  switch (b.tag) {
    case 1:
      return Zf(b.type) && $f(), a = b.flags, a & 65536 ? (b.flags = a & -65537 | 128, b) : null;
    case 3:
      return zh(), E(Wf), E(H), Eh(), a = b.flags, 0 !== (a & 65536) && 0 === (a & 128) ? (b.flags = a & -65537 | 128, b) : null;
    case 5:
      return Bh(b), null;
    case 13:
      E(L);
      a = b.memoizedState;
      if (null !== a && null !== a.dehydrated) {
        if (null === b.alternate) throw Error(p(340));
        Ig();
      }
      a = b.flags;
      return a & 65536 ? (b.flags = a & -65537 | 128, b) : null;
    case 19:
      return E(L), null;
    case 4:
      return zh(), null;
    case 10:
      return ah(b.type._context), null;
    case 22:
    case 23:
      return Hj(), null;
    case 24:
      return null;
    default:
      return null;
  }
}
var Jj = false, U = false, Kj = "function" === typeof WeakSet ? WeakSet : Set, V = null;
function Lj(a, b) {
  var c = a.ref;
  if (null !== c) if ("function" === typeof c) try {
    c(null);
  } catch (d) {
    W(a, b, d);
  }
  else c.current = null;
}
function Mj(a, b, c) {
  try {
    c();
  } catch (d) {
    W(a, b, d);
  }
}
var Nj = false;
function Oj(a, b) {
  Cf = dd;
  a = Me();
  if (Ne(a)) {
    if ("selectionStart" in a) var c = { start: a.selectionStart, end: a.selectionEnd };
    else a: {
      c = (c = a.ownerDocument) && c.defaultView || window;
      var d = c.getSelection && c.getSelection();
      if (d && 0 !== d.rangeCount) {
        c = d.anchorNode;
        var e = d.anchorOffset, f2 = d.focusNode;
        d = d.focusOffset;
        try {
          c.nodeType, f2.nodeType;
        } catch (F2) {
          c = null;
          break a;
        }
        var g = 0, h = -1, k2 = -1, l2 = 0, m2 = 0, q2 = a, r2 = null;
        b: for (; ; ) {
          for (var y2; ; ) {
            q2 !== c || 0 !== e && 3 !== q2.nodeType || (h = g + e);
            q2 !== f2 || 0 !== d && 3 !== q2.nodeType || (k2 = g + d);
            3 === q2.nodeType && (g += q2.nodeValue.length);
            if (null === (y2 = q2.firstChild)) break;
            r2 = q2;
            q2 = y2;
          }
          for (; ; ) {
            if (q2 === a) break b;
            r2 === c && ++l2 === e && (h = g);
            r2 === f2 && ++m2 === d && (k2 = g);
            if (null !== (y2 = q2.nextSibling)) break;
            q2 = r2;
            r2 = q2.parentNode;
          }
          q2 = y2;
        }
        c = -1 === h || -1 === k2 ? null : { start: h, end: k2 };
      } else c = null;
    }
    c = c || { start: 0, end: 0 };
  } else c = null;
  Df = { focusedElem: a, selectionRange: c };
  dd = false;
  for (V = b; null !== V; ) if (b = V, a = b.child, 0 !== (b.subtreeFlags & 1028) && null !== a) a.return = b, V = a;
  else for (; null !== V; ) {
    b = V;
    try {
      var n2 = b.alternate;
      if (0 !== (b.flags & 1024)) switch (b.tag) {
        case 0:
        case 11:
        case 15:
          break;
        case 1:
          if (null !== n2) {
            var t2 = n2.memoizedProps, J2 = n2.memoizedState, x2 = b.stateNode, w2 = x2.getSnapshotBeforeUpdate(b.elementType === b.type ? t2 : Ci(b.type, t2), J2);
            x2.__reactInternalSnapshotBeforeUpdate = w2;
          }
          break;
        case 3:
          var u2 = b.stateNode.containerInfo;
          1 === u2.nodeType ? u2.textContent = "" : 9 === u2.nodeType && u2.documentElement && u2.removeChild(u2.documentElement);
          break;
        case 5:
        case 6:
        case 4:
        case 17:
          break;
        default:
          throw Error(p(163));
      }
    } catch (F2) {
      W(b, b.return, F2);
    }
    a = b.sibling;
    if (null !== a) {
      a.return = b.return;
      V = a;
      break;
    }
    V = b.return;
  }
  n2 = Nj;
  Nj = false;
  return n2;
}
function Pj(a, b, c) {
  var d = b.updateQueue;
  d = null !== d ? d.lastEffect : null;
  if (null !== d) {
    var e = d = d.next;
    do {
      if ((e.tag & a) === a) {
        var f2 = e.destroy;
        e.destroy = void 0;
        void 0 !== f2 && Mj(b, c, f2);
      }
      e = e.next;
    } while (e !== d);
  }
}
function Qj(a, b) {
  b = b.updateQueue;
  b = null !== b ? b.lastEffect : null;
  if (null !== b) {
    var c = b = b.next;
    do {
      if ((c.tag & a) === a) {
        var d = c.create;
        c.destroy = d();
      }
      c = c.next;
    } while (c !== b);
  }
}
function Rj(a) {
  var b = a.ref;
  if (null !== b) {
    var c = a.stateNode;
    switch (a.tag) {
      case 5:
        a = c;
        break;
      default:
        a = c;
    }
    "function" === typeof b ? b(a) : b.current = a;
  }
}
function Sj(a) {
  var b = a.alternate;
  null !== b && (a.alternate = null, Sj(b));
  a.child = null;
  a.deletions = null;
  a.sibling = null;
  5 === a.tag && (b = a.stateNode, null !== b && (delete b[Of], delete b[Pf], delete b[of], delete b[Qf], delete b[Rf]));
  a.stateNode = null;
  a.return = null;
  a.dependencies = null;
  a.memoizedProps = null;
  a.memoizedState = null;
  a.pendingProps = null;
  a.stateNode = null;
  a.updateQueue = null;
}
function Tj(a) {
  return 5 === a.tag || 3 === a.tag || 4 === a.tag;
}
function Uj(a) {
  a: for (; ; ) {
    for (; null === a.sibling; ) {
      if (null === a.return || Tj(a.return)) return null;
      a = a.return;
    }
    a.sibling.return = a.return;
    for (a = a.sibling; 5 !== a.tag && 6 !== a.tag && 18 !== a.tag; ) {
      if (a.flags & 2) continue a;
      if (null === a.child || 4 === a.tag) continue a;
      else a.child.return = a, a = a.child;
    }
    if (!(a.flags & 2)) return a.stateNode;
  }
}
function Vj(a, b, c) {
  var d = a.tag;
  if (5 === d || 6 === d) a = a.stateNode, b ? 8 === c.nodeType ? c.parentNode.insertBefore(a, b) : c.insertBefore(a, b) : (8 === c.nodeType ? (b = c.parentNode, b.insertBefore(a, c)) : (b = c, b.appendChild(a)), c = c._reactRootContainer, null !== c && void 0 !== c || null !== b.onclick || (b.onclick = Bf));
  else if (4 !== d && (a = a.child, null !== a)) for (Vj(a, b, c), a = a.sibling; null !== a; ) Vj(a, b, c), a = a.sibling;
}
function Wj(a, b, c) {
  var d = a.tag;
  if (5 === d || 6 === d) a = a.stateNode, b ? c.insertBefore(a, b) : c.appendChild(a);
  else if (4 !== d && (a = a.child, null !== a)) for (Wj(a, b, c), a = a.sibling; null !== a; ) Wj(a, b, c), a = a.sibling;
}
var X = null, Xj = false;
function Yj(a, b, c) {
  for (c = c.child; null !== c; ) Zj(a, b, c), c = c.sibling;
}
function Zj(a, b, c) {
  if (lc && "function" === typeof lc.onCommitFiberUnmount) try {
    lc.onCommitFiberUnmount(kc, c);
  } catch (h) {
  }
  switch (c.tag) {
    case 5:
      U || Lj(c, b);
    case 6:
      var d = X, e = Xj;
      X = null;
      Yj(a, b, c);
      X = d;
      Xj = e;
      null !== X && (Xj ? (a = X, c = c.stateNode, 8 === a.nodeType ? a.parentNode.removeChild(c) : a.removeChild(c)) : X.removeChild(c.stateNode));
      break;
    case 18:
      null !== X && (Xj ? (a = X, c = c.stateNode, 8 === a.nodeType ? Kf(a.parentNode, c) : 1 === a.nodeType && Kf(a, c), bd(a)) : Kf(X, c.stateNode));
      break;
    case 4:
      d = X;
      e = Xj;
      X = c.stateNode.containerInfo;
      Xj = true;
      Yj(a, b, c);
      X = d;
      Xj = e;
      break;
    case 0:
    case 11:
    case 14:
    case 15:
      if (!U && (d = c.updateQueue, null !== d && (d = d.lastEffect, null !== d))) {
        e = d = d.next;
        do {
          var f2 = e, g = f2.destroy;
          f2 = f2.tag;
          void 0 !== g && (0 !== (f2 & 2) ? Mj(c, b, g) : 0 !== (f2 & 4) && Mj(c, b, g));
          e = e.next;
        } while (e !== d);
      }
      Yj(a, b, c);
      break;
    case 1:
      if (!U && (Lj(c, b), d = c.stateNode, "function" === typeof d.componentWillUnmount)) try {
        d.props = c.memoizedProps, d.state = c.memoizedState, d.componentWillUnmount();
      } catch (h) {
        W(c, b, h);
      }
      Yj(a, b, c);
      break;
    case 21:
      Yj(a, b, c);
      break;
    case 22:
      c.mode & 1 ? (U = (d = U) || null !== c.memoizedState, Yj(a, b, c), U = d) : Yj(a, b, c);
      break;
    default:
      Yj(a, b, c);
  }
}
function ak(a) {
  var b = a.updateQueue;
  if (null !== b) {
    a.updateQueue = null;
    var c = a.stateNode;
    null === c && (c = a.stateNode = new Kj());
    b.forEach(function(b2) {
      var d = bk.bind(null, a, b2);
      c.has(b2) || (c.add(b2), b2.then(d, d));
    });
  }
}
function ck(a, b) {
  var c = b.deletions;
  if (null !== c) for (var d = 0; d < c.length; d++) {
    var e = c[d];
    try {
      var f2 = a, g = b, h = g;
      a: for (; null !== h; ) {
        switch (h.tag) {
          case 5:
            X = h.stateNode;
            Xj = false;
            break a;
          case 3:
            X = h.stateNode.containerInfo;
            Xj = true;
            break a;
          case 4:
            X = h.stateNode.containerInfo;
            Xj = true;
            break a;
        }
        h = h.return;
      }
      if (null === X) throw Error(p(160));
      Zj(f2, g, e);
      X = null;
      Xj = false;
      var k2 = e.alternate;
      null !== k2 && (k2.return = null);
      e.return = null;
    } catch (l2) {
      W(e, b, l2);
    }
  }
  if (b.subtreeFlags & 12854) for (b = b.child; null !== b; ) dk(b, a), b = b.sibling;
}
function dk(a, b) {
  var c = a.alternate, d = a.flags;
  switch (a.tag) {
    case 0:
    case 11:
    case 14:
    case 15:
      ck(b, a);
      ek(a);
      if (d & 4) {
        try {
          Pj(3, a, a.return), Qj(3, a);
        } catch (t2) {
          W(a, a.return, t2);
        }
        try {
          Pj(5, a, a.return);
        } catch (t2) {
          W(a, a.return, t2);
        }
      }
      break;
    case 1:
      ck(b, a);
      ek(a);
      d & 512 && null !== c && Lj(c, c.return);
      break;
    case 5:
      ck(b, a);
      ek(a);
      d & 512 && null !== c && Lj(c, c.return);
      if (a.flags & 32) {
        var e = a.stateNode;
        try {
          ob(e, "");
        } catch (t2) {
          W(a, a.return, t2);
        }
      }
      if (d & 4 && (e = a.stateNode, null != e)) {
        var f2 = a.memoizedProps, g = null !== c ? c.memoizedProps : f2, h = a.type, k2 = a.updateQueue;
        a.updateQueue = null;
        if (null !== k2) try {
          "input" === h && "radio" === f2.type && null != f2.name && ab(e, f2);
          vb(h, g);
          var l2 = vb(h, f2);
          for (g = 0; g < k2.length; g += 2) {
            var m2 = k2[g], q2 = k2[g + 1];
            "style" === m2 ? sb(e, q2) : "dangerouslySetInnerHTML" === m2 ? nb(e, q2) : "children" === m2 ? ob(e, q2) : ta(e, m2, q2, l2);
          }
          switch (h) {
            case "input":
              bb(e, f2);
              break;
            case "textarea":
              ib(e, f2);
              break;
            case "select":
              var r2 = e._wrapperState.wasMultiple;
              e._wrapperState.wasMultiple = !!f2.multiple;
              var y2 = f2.value;
              null != y2 ? fb(e, !!f2.multiple, y2, false) : r2 !== !!f2.multiple && (null != f2.defaultValue ? fb(
                e,
                !!f2.multiple,
                f2.defaultValue,
                true
              ) : fb(e, !!f2.multiple, f2.multiple ? [] : "", false));
          }
          e[Pf] = f2;
        } catch (t2) {
          W(a, a.return, t2);
        }
      }
      break;
    case 6:
      ck(b, a);
      ek(a);
      if (d & 4) {
        if (null === a.stateNode) throw Error(p(162));
        e = a.stateNode;
        f2 = a.memoizedProps;
        try {
          e.nodeValue = f2;
        } catch (t2) {
          W(a, a.return, t2);
        }
      }
      break;
    case 3:
      ck(b, a);
      ek(a);
      if (d & 4 && null !== c && c.memoizedState.isDehydrated) try {
        bd(b.containerInfo);
      } catch (t2) {
        W(a, a.return, t2);
      }
      break;
    case 4:
      ck(b, a);
      ek(a);
      break;
    case 13:
      ck(b, a);
      ek(a);
      e = a.child;
      e.flags & 8192 && (f2 = null !== e.memoizedState, e.stateNode.isHidden = f2, !f2 || null !== e.alternate && null !== e.alternate.memoizedState || (fk = B()));
      d & 4 && ak(a);
      break;
    case 22:
      m2 = null !== c && null !== c.memoizedState;
      a.mode & 1 ? (U = (l2 = U) || m2, ck(b, a), U = l2) : ck(b, a);
      ek(a);
      if (d & 8192) {
        l2 = null !== a.memoizedState;
        if ((a.stateNode.isHidden = l2) && !m2 && 0 !== (a.mode & 1)) for (V = a, m2 = a.child; null !== m2; ) {
          for (q2 = V = m2; null !== V; ) {
            r2 = V;
            y2 = r2.child;
            switch (r2.tag) {
              case 0:
              case 11:
              case 14:
              case 15:
                Pj(4, r2, r2.return);
                break;
              case 1:
                Lj(r2, r2.return);
                var n2 = r2.stateNode;
                if ("function" === typeof n2.componentWillUnmount) {
                  d = r2;
                  c = r2.return;
                  try {
                    b = d, n2.props = b.memoizedProps, n2.state = b.memoizedState, n2.componentWillUnmount();
                  } catch (t2) {
                    W(d, c, t2);
                  }
                }
                break;
              case 5:
                Lj(r2, r2.return);
                break;
              case 22:
                if (null !== r2.memoizedState) {
                  gk(q2);
                  continue;
                }
            }
            null !== y2 ? (y2.return = r2, V = y2) : gk(q2);
          }
          m2 = m2.sibling;
        }
        a: for (m2 = null, q2 = a; ; ) {
          if (5 === q2.tag) {
            if (null === m2) {
              m2 = q2;
              try {
                e = q2.stateNode, l2 ? (f2 = e.style, "function" === typeof f2.setProperty ? f2.setProperty("display", "none", "important") : f2.display = "none") : (h = q2.stateNode, k2 = q2.memoizedProps.style, g = void 0 !== k2 && null !== k2 && k2.hasOwnProperty("display") ? k2.display : null, h.style.display = rb("display", g));
              } catch (t2) {
                W(a, a.return, t2);
              }
            }
          } else if (6 === q2.tag) {
            if (null === m2) try {
              q2.stateNode.nodeValue = l2 ? "" : q2.memoizedProps;
            } catch (t2) {
              W(a, a.return, t2);
            }
          } else if ((22 !== q2.tag && 23 !== q2.tag || null === q2.memoizedState || q2 === a) && null !== q2.child) {
            q2.child.return = q2;
            q2 = q2.child;
            continue;
          }
          if (q2 === a) break a;
          for (; null === q2.sibling; ) {
            if (null === q2.return || q2.return === a) break a;
            m2 === q2 && (m2 = null);
            q2 = q2.return;
          }
          m2 === q2 && (m2 = null);
          q2.sibling.return = q2.return;
          q2 = q2.sibling;
        }
      }
      break;
    case 19:
      ck(b, a);
      ek(a);
      d & 4 && ak(a);
      break;
    case 21:
      break;
    default:
      ck(
        b,
        a
      ), ek(a);
  }
}
function ek(a) {
  var b = a.flags;
  if (b & 2) {
    try {
      a: {
        for (var c = a.return; null !== c; ) {
          if (Tj(c)) {
            var d = c;
            break a;
          }
          c = c.return;
        }
        throw Error(p(160));
      }
      switch (d.tag) {
        case 5:
          var e = d.stateNode;
          d.flags & 32 && (ob(e, ""), d.flags &= -33);
          var f2 = Uj(a);
          Wj(a, f2, e);
          break;
        case 3:
        case 4:
          var g = d.stateNode.containerInfo, h = Uj(a);
          Vj(a, h, g);
          break;
        default:
          throw Error(p(161));
      }
    } catch (k2) {
      W(a, a.return, k2);
    }
    a.flags &= -3;
  }
  b & 4096 && (a.flags &= -4097);
}
function hk(a, b, c) {
  V = a;
  ik(a);
}
function ik(a, b, c) {
  for (var d = 0 !== (a.mode & 1); null !== V; ) {
    var e = V, f2 = e.child;
    if (22 === e.tag && d) {
      var g = null !== e.memoizedState || Jj;
      if (!g) {
        var h = e.alternate, k2 = null !== h && null !== h.memoizedState || U;
        h = Jj;
        var l2 = U;
        Jj = g;
        if ((U = k2) && !l2) for (V = e; null !== V; ) g = V, k2 = g.child, 22 === g.tag && null !== g.memoizedState ? jk(e) : null !== k2 ? (k2.return = g, V = k2) : jk(e);
        for (; null !== f2; ) V = f2, ik(f2), f2 = f2.sibling;
        V = e;
        Jj = h;
        U = l2;
      }
      kk(a);
    } else 0 !== (e.subtreeFlags & 8772) && null !== f2 ? (f2.return = e, V = f2) : kk(a);
  }
}
function kk(a) {
  for (; null !== V; ) {
    var b = V;
    if (0 !== (b.flags & 8772)) {
      var c = b.alternate;
      try {
        if (0 !== (b.flags & 8772)) switch (b.tag) {
          case 0:
          case 11:
          case 15:
            U || Qj(5, b);
            break;
          case 1:
            var d = b.stateNode;
            if (b.flags & 4 && !U) if (null === c) d.componentDidMount();
            else {
              var e = b.elementType === b.type ? c.memoizedProps : Ci(b.type, c.memoizedProps);
              d.componentDidUpdate(e, c.memoizedState, d.__reactInternalSnapshotBeforeUpdate);
            }
            var f2 = b.updateQueue;
            null !== f2 && sh(b, f2, d);
            break;
          case 3:
            var g = b.updateQueue;
            if (null !== g) {
              c = null;
              if (null !== b.child) switch (b.child.tag) {
                case 5:
                  c = b.child.stateNode;
                  break;
                case 1:
                  c = b.child.stateNode;
              }
              sh(b, g, c);
            }
            break;
          case 5:
            var h = b.stateNode;
            if (null === c && b.flags & 4) {
              c = h;
              var k2 = b.memoizedProps;
              switch (b.type) {
                case "button":
                case "input":
                case "select":
                case "textarea":
                  k2.autoFocus && c.focus();
                  break;
                case "img":
                  k2.src && (c.src = k2.src);
              }
            }
            break;
          case 6:
            break;
          case 4:
            break;
          case 12:
            break;
          case 13:
            if (null === b.memoizedState) {
              var l2 = b.alternate;
              if (null !== l2) {
                var m2 = l2.memoizedState;
                if (null !== m2) {
                  var q2 = m2.dehydrated;
                  null !== q2 && bd(q2);
                }
              }
            }
            break;
          case 19:
          case 17:
          case 21:
          case 22:
          case 23:
          case 25:
            break;
          default:
            throw Error(p(163));
        }
        U || b.flags & 512 && Rj(b);
      } catch (r2) {
        W(b, b.return, r2);
      }
    }
    if (b === a) {
      V = null;
      break;
    }
    c = b.sibling;
    if (null !== c) {
      c.return = b.return;
      V = c;
      break;
    }
    V = b.return;
  }
}
function gk(a) {
  for (; null !== V; ) {
    var b = V;
    if (b === a) {
      V = null;
      break;
    }
    var c = b.sibling;
    if (null !== c) {
      c.return = b.return;
      V = c;
      break;
    }
    V = b.return;
  }
}
function jk(a) {
  for (; null !== V; ) {
    var b = V;
    try {
      switch (b.tag) {
        case 0:
        case 11:
        case 15:
          var c = b.return;
          try {
            Qj(4, b);
          } catch (k2) {
            W(b, c, k2);
          }
          break;
        case 1:
          var d = b.stateNode;
          if ("function" === typeof d.componentDidMount) {
            var e = b.return;
            try {
              d.componentDidMount();
            } catch (k2) {
              W(b, e, k2);
            }
          }
          var f2 = b.return;
          try {
            Rj(b);
          } catch (k2) {
            W(b, f2, k2);
          }
          break;
        case 5:
          var g = b.return;
          try {
            Rj(b);
          } catch (k2) {
            W(b, g, k2);
          }
      }
    } catch (k2) {
      W(b, b.return, k2);
    }
    if (b === a) {
      V = null;
      break;
    }
    var h = b.sibling;
    if (null !== h) {
      h.return = b.return;
      V = h;
      break;
    }
    V = b.return;
  }
}
var lk = Math.ceil, mk = ua.ReactCurrentDispatcher, nk = ua.ReactCurrentOwner, ok = ua.ReactCurrentBatchConfig, K = 0, Q = null, Y = null, Z = 0, fj = 0, ej = Uf(0), T = 0, pk = null, rh = 0, qk = 0, rk = 0, sk = null, tk = null, fk = 0, Gj = Infinity, uk = null, Oi = false, Pi = null, Ri = null, vk = false, wk = null, xk = 0, yk = 0, zk = null, Ak = -1, Bk = 0;
function R() {
  return 0 !== (K & 6) ? B() : -1 !== Ak ? Ak : Ak = B();
}
function yi(a) {
  if (0 === (a.mode & 1)) return 1;
  if (0 !== (K & 2) && 0 !== Z) return Z & -Z;
  if (null !== Kg.transition) return 0 === Bk && (Bk = yc()), Bk;
  a = C;
  if (0 !== a) return a;
  a = window.event;
  a = void 0 === a ? 16 : jd(a.type);
  return a;
}
function gi(a, b, c, d) {
  if (50 < yk) throw yk = 0, zk = null, Error(p(185));
  Ac(a, c, d);
  if (0 === (K & 2) || a !== Q) a === Q && (0 === (K & 2) && (qk |= c), 4 === T && Ck(a, Z)), Dk(a, d), 1 === c && 0 === K && 0 === (b.mode & 1) && (Gj = B() + 500, fg && jg());
}
function Dk(a, b) {
  var c = a.callbackNode;
  wc(a, b);
  var d = uc(a, a === Q ? Z : 0);
  if (0 === d) null !== c && bc(c), a.callbackNode = null, a.callbackPriority = 0;
  else if (b = d & -d, a.callbackPriority !== b) {
    null != c && bc(c);
    if (1 === b) 0 === a.tag ? ig(Ek.bind(null, a)) : hg(Ek.bind(null, a)), Jf(function() {
      0 === (K & 6) && jg();
    }), c = null;
    else {
      switch (Dc(d)) {
        case 1:
          c = fc;
          break;
        case 4:
          c = gc;
          break;
        case 16:
          c = hc;
          break;
        case 536870912:
          c = jc;
          break;
        default:
          c = hc;
      }
      c = Fk(c, Gk.bind(null, a));
    }
    a.callbackPriority = b;
    a.callbackNode = c;
  }
}
function Gk(a, b) {
  Ak = -1;
  Bk = 0;
  if (0 !== (K & 6)) throw Error(p(327));
  var c = a.callbackNode;
  if (Hk() && a.callbackNode !== c) return null;
  var d = uc(a, a === Q ? Z : 0);
  if (0 === d) return null;
  if (0 !== (d & 30) || 0 !== (d & a.expiredLanes) || b) b = Ik(a, d);
  else {
    b = d;
    var e = K;
    K |= 2;
    var f2 = Jk();
    if (Q !== a || Z !== b) uk = null, Gj = B() + 500, Kk(a, b);
    do
      try {
        Lk();
        break;
      } catch (h) {
        Mk(a, h);
      }
    while (1);
    $g();
    mk.current = f2;
    K = e;
    null !== Y ? b = 0 : (Q = null, Z = 0, b = T);
  }
  if (0 !== b) {
    2 === b && (e = xc(a), 0 !== e && (d = e, b = Nk(a, e)));
    if (1 === b) throw c = pk, Kk(a, 0), Ck(a, d), Dk(a, B()), c;
    if (6 === b) Ck(a, d);
    else {
      e = a.current.alternate;
      if (0 === (d & 30) && !Ok(e) && (b = Ik(a, d), 2 === b && (f2 = xc(a), 0 !== f2 && (d = f2, b = Nk(a, f2))), 1 === b)) throw c = pk, Kk(a, 0), Ck(a, d), Dk(a, B()), c;
      a.finishedWork = e;
      a.finishedLanes = d;
      switch (b) {
        case 0:
        case 1:
          throw Error(p(345));
        case 2:
          Pk(a, tk, uk);
          break;
        case 3:
          Ck(a, d);
          if ((d & 130023424) === d && (b = fk + 500 - B(), 10 < b)) {
            if (0 !== uc(a, 0)) break;
            e = a.suspendedLanes;
            if ((e & d) !== d) {
              R();
              a.pingedLanes |= a.suspendedLanes & e;
              break;
            }
            a.timeoutHandle = Ff(Pk.bind(null, a, tk, uk), b);
            break;
          }
          Pk(a, tk, uk);
          break;
        case 4:
          Ck(a, d);
          if ((d & 4194240) === d) break;
          b = a.eventTimes;
          for (e = -1; 0 < d; ) {
            var g = 31 - oc(d);
            f2 = 1 << g;
            g = b[g];
            g > e && (e = g);
            d &= ~f2;
          }
          d = e;
          d = B() - d;
          d = (120 > d ? 120 : 480 > d ? 480 : 1080 > d ? 1080 : 1920 > d ? 1920 : 3e3 > d ? 3e3 : 4320 > d ? 4320 : 1960 * lk(d / 1960)) - d;
          if (10 < d) {
            a.timeoutHandle = Ff(Pk.bind(null, a, tk, uk), d);
            break;
          }
          Pk(a, tk, uk);
          break;
        case 5:
          Pk(a, tk, uk);
          break;
        default:
          throw Error(p(329));
      }
    }
  }
  Dk(a, B());
  return a.callbackNode === c ? Gk.bind(null, a) : null;
}
function Nk(a, b) {
  var c = sk;
  a.current.memoizedState.isDehydrated && (Kk(a, b).flags |= 256);
  a = Ik(a, b);
  2 !== a && (b = tk, tk = c, null !== b && Fj(b));
  return a;
}
function Fj(a) {
  null === tk ? tk = a : tk.push.apply(tk, a);
}
function Ok(a) {
  for (var b = a; ; ) {
    if (b.flags & 16384) {
      var c = b.updateQueue;
      if (null !== c && (c = c.stores, null !== c)) for (var d = 0; d < c.length; d++) {
        var e = c[d], f2 = e.getSnapshot;
        e = e.value;
        try {
          if (!He(f2(), e)) return false;
        } catch (g) {
          return false;
        }
      }
    }
    c = b.child;
    if (b.subtreeFlags & 16384 && null !== c) c.return = b, b = c;
    else {
      if (b === a) break;
      for (; null === b.sibling; ) {
        if (null === b.return || b.return === a) return true;
        b = b.return;
      }
      b.sibling.return = b.return;
      b = b.sibling;
    }
  }
  return true;
}
function Ck(a, b) {
  b &= ~rk;
  b &= ~qk;
  a.suspendedLanes |= b;
  a.pingedLanes &= ~b;
  for (a = a.expirationTimes; 0 < b; ) {
    var c = 31 - oc(b), d = 1 << c;
    a[c] = -1;
    b &= ~d;
  }
}
function Ek(a) {
  if (0 !== (K & 6)) throw Error(p(327));
  Hk();
  var b = uc(a, 0);
  if (0 === (b & 1)) return Dk(a, B()), null;
  var c = Ik(a, b);
  if (0 !== a.tag && 2 === c) {
    var d = xc(a);
    0 !== d && (b = d, c = Nk(a, d));
  }
  if (1 === c) throw c = pk, Kk(a, 0), Ck(a, b), Dk(a, B()), c;
  if (6 === c) throw Error(p(345));
  a.finishedWork = a.current.alternate;
  a.finishedLanes = b;
  Pk(a, tk, uk);
  Dk(a, B());
  return null;
}
function Qk(a, b) {
  var c = K;
  K |= 1;
  try {
    return a(b);
  } finally {
    K = c, 0 === K && (Gj = B() + 500, fg && jg());
  }
}
function Rk(a) {
  null !== wk && 0 === wk.tag && 0 === (K & 6) && Hk();
  var b = K;
  K |= 1;
  var c = ok.transition, d = C;
  try {
    if (ok.transition = null, C = 1, a) return a();
  } finally {
    C = d, ok.transition = c, K = b, 0 === (K & 6) && jg();
  }
}
function Hj() {
  fj = ej.current;
  E(ej);
}
function Kk(a, b) {
  a.finishedWork = null;
  a.finishedLanes = 0;
  var c = a.timeoutHandle;
  -1 !== c && (a.timeoutHandle = -1, Gf(c));
  if (null !== Y) for (c = Y.return; null !== c; ) {
    var d = c;
    wg(d);
    switch (d.tag) {
      case 1:
        d = d.type.childContextTypes;
        null !== d && void 0 !== d && $f();
        break;
      case 3:
        zh();
        E(Wf);
        E(H);
        Eh();
        break;
      case 5:
        Bh(d);
        break;
      case 4:
        zh();
        break;
      case 13:
        E(L);
        break;
      case 19:
        E(L);
        break;
      case 10:
        ah(d.type._context);
        break;
      case 22:
      case 23:
        Hj();
    }
    c = c.return;
  }
  Q = a;
  Y = a = Pg(a.current, null);
  Z = fj = b;
  T = 0;
  pk = null;
  rk = qk = rh = 0;
  tk = sk = null;
  if (null !== fh) {
    for (b = 0; b < fh.length; b++) if (c = fh[b], d = c.interleaved, null !== d) {
      c.interleaved = null;
      var e = d.next, f2 = c.pending;
      if (null !== f2) {
        var g = f2.next;
        f2.next = e;
        d.next = g;
      }
      c.pending = d;
    }
    fh = null;
  }
  return a;
}
function Mk(a, b) {
  do {
    var c = Y;
    try {
      $g();
      Fh.current = Rh;
      if (Ih) {
        for (var d = M.memoizedState; null !== d; ) {
          var e = d.queue;
          null !== e && (e.pending = null);
          d = d.next;
        }
        Ih = false;
      }
      Hh = 0;
      O = N = M = null;
      Jh = false;
      Kh = 0;
      nk.current = null;
      if (null === c || null === c.return) {
        T = 1;
        pk = b;
        Y = null;
        break;
      }
      a: {
        var f2 = a, g = c.return, h = c, k2 = b;
        b = Z;
        h.flags |= 32768;
        if (null !== k2 && "object" === typeof k2 && "function" === typeof k2.then) {
          var l2 = k2, m2 = h, q2 = m2.tag;
          if (0 === (m2.mode & 1) && (0 === q2 || 11 === q2 || 15 === q2)) {
            var r2 = m2.alternate;
            r2 ? (m2.updateQueue = r2.updateQueue, m2.memoizedState = r2.memoizedState, m2.lanes = r2.lanes) : (m2.updateQueue = null, m2.memoizedState = null);
          }
          var y2 = Ui(g);
          if (null !== y2) {
            y2.flags &= -257;
            Vi(y2, g, h, f2, b);
            y2.mode & 1 && Si(f2, l2, b);
            b = y2;
            k2 = l2;
            var n2 = b.updateQueue;
            if (null === n2) {
              var t2 = /* @__PURE__ */ new Set();
              t2.add(k2);
              b.updateQueue = t2;
            } else n2.add(k2);
            break a;
          } else {
            if (0 === (b & 1)) {
              Si(f2, l2, b);
              tj();
              break a;
            }
            k2 = Error(p(426));
          }
        } else if (I && h.mode & 1) {
          var J2 = Ui(g);
          if (null !== J2) {
            0 === (J2.flags & 65536) && (J2.flags |= 256);
            Vi(J2, g, h, f2, b);
            Jg(Ji(k2, h));
            break a;
          }
        }
        f2 = k2 = Ji(k2, h);
        4 !== T && (T = 2);
        null === sk ? sk = [f2] : sk.push(f2);
        f2 = g;
        do {
          switch (f2.tag) {
            case 3:
              f2.flags |= 65536;
              b &= -b;
              f2.lanes |= b;
              var x2 = Ni(f2, k2, b);
              ph(f2, x2);
              break a;
            case 1:
              h = k2;
              var w2 = f2.type, u2 = f2.stateNode;
              if (0 === (f2.flags & 128) && ("function" === typeof w2.getDerivedStateFromError || null !== u2 && "function" === typeof u2.componentDidCatch && (null === Ri || !Ri.has(u2)))) {
                f2.flags |= 65536;
                b &= -b;
                f2.lanes |= b;
                var F2 = Qi(f2, h, b);
                ph(f2, F2);
                break a;
              }
          }
          f2 = f2.return;
        } while (null !== f2);
      }
      Sk(c);
    } catch (na) {
      b = na;
      Y === c && null !== c && (Y = c = c.return);
      continue;
    }
    break;
  } while (1);
}
function Jk() {
  var a = mk.current;
  mk.current = Rh;
  return null === a ? Rh : a;
}
function tj() {
  if (0 === T || 3 === T || 2 === T) T = 4;
  null === Q || 0 === (rh & 268435455) && 0 === (qk & 268435455) || Ck(Q, Z);
}
function Ik(a, b) {
  var c = K;
  K |= 2;
  var d = Jk();
  if (Q !== a || Z !== b) uk = null, Kk(a, b);
  do
    try {
      Tk();
      break;
    } catch (e) {
      Mk(a, e);
    }
  while (1);
  $g();
  K = c;
  mk.current = d;
  if (null !== Y) throw Error(p(261));
  Q = null;
  Z = 0;
  return T;
}
function Tk() {
  for (; null !== Y; ) Uk(Y);
}
function Lk() {
  for (; null !== Y && !cc(); ) Uk(Y);
}
function Uk(a) {
  var b = Vk(a.alternate, a, fj);
  a.memoizedProps = a.pendingProps;
  null === b ? Sk(a) : Y = b;
  nk.current = null;
}
function Sk(a) {
  var b = a;
  do {
    var c = b.alternate;
    a = b.return;
    if (0 === (b.flags & 32768)) {
      if (c = Ej(c, b, fj), null !== c) {
        Y = c;
        return;
      }
    } else {
      c = Ij(c, b);
      if (null !== c) {
        c.flags &= 32767;
        Y = c;
        return;
      }
      if (null !== a) a.flags |= 32768, a.subtreeFlags = 0, a.deletions = null;
      else {
        T = 6;
        Y = null;
        return;
      }
    }
    b = b.sibling;
    if (null !== b) {
      Y = b;
      return;
    }
    Y = b = a;
  } while (null !== b);
  0 === T && (T = 5);
}
function Pk(a, b, c) {
  var d = C, e = ok.transition;
  try {
    ok.transition = null, C = 1, Wk(a, b, c, d);
  } finally {
    ok.transition = e, C = d;
  }
  return null;
}
function Wk(a, b, c, d) {
  do
    Hk();
  while (null !== wk);
  if (0 !== (K & 6)) throw Error(p(327));
  c = a.finishedWork;
  var e = a.finishedLanes;
  if (null === c) return null;
  a.finishedWork = null;
  a.finishedLanes = 0;
  if (c === a.current) throw Error(p(177));
  a.callbackNode = null;
  a.callbackPriority = 0;
  var f2 = c.lanes | c.childLanes;
  Bc(a, f2);
  a === Q && (Y = Q = null, Z = 0);
  0 === (c.subtreeFlags & 2064) && 0 === (c.flags & 2064) || vk || (vk = true, Fk(hc, function() {
    Hk();
    return null;
  }));
  f2 = 0 !== (c.flags & 15990);
  if (0 !== (c.subtreeFlags & 15990) || f2) {
    f2 = ok.transition;
    ok.transition = null;
    var g = C;
    C = 1;
    var h = K;
    K |= 4;
    nk.current = null;
    Oj(a, c);
    dk(c, a);
    Oe(Df);
    dd = !!Cf;
    Df = Cf = null;
    a.current = c;
    hk(c);
    dc();
    K = h;
    C = g;
    ok.transition = f2;
  } else a.current = c;
  vk && (vk = false, wk = a, xk = e);
  f2 = a.pendingLanes;
  0 === f2 && (Ri = null);
  mc(c.stateNode);
  Dk(a, B());
  if (null !== b) for (d = a.onRecoverableError, c = 0; c < b.length; c++) e = b[c], d(e.value, { componentStack: e.stack, digest: e.digest });
  if (Oi) throw Oi = false, a = Pi, Pi = null, a;
  0 !== (xk & 1) && 0 !== a.tag && Hk();
  f2 = a.pendingLanes;
  0 !== (f2 & 1) ? a === zk ? yk++ : (yk = 0, zk = a) : yk = 0;
  jg();
  return null;
}
function Hk() {
  if (null !== wk) {
    var a = Dc(xk), b = ok.transition, c = C;
    try {
      ok.transition = null;
      C = 16 > a ? 16 : a;
      if (null === wk) var d = false;
      else {
        a = wk;
        wk = null;
        xk = 0;
        if (0 !== (K & 6)) throw Error(p(331));
        var e = K;
        K |= 4;
        for (V = a.current; null !== V; ) {
          var f2 = V, g = f2.child;
          if (0 !== (V.flags & 16)) {
            var h = f2.deletions;
            if (null !== h) {
              for (var k2 = 0; k2 < h.length; k2++) {
                var l2 = h[k2];
                for (V = l2; null !== V; ) {
                  var m2 = V;
                  switch (m2.tag) {
                    case 0:
                    case 11:
                    case 15:
                      Pj(8, m2, f2);
                  }
                  var q2 = m2.child;
                  if (null !== q2) q2.return = m2, V = q2;
                  else for (; null !== V; ) {
                    m2 = V;
                    var r2 = m2.sibling, y2 = m2.return;
                    Sj(m2);
                    if (m2 === l2) {
                      V = null;
                      break;
                    }
                    if (null !== r2) {
                      r2.return = y2;
                      V = r2;
                      break;
                    }
                    V = y2;
                  }
                }
              }
              var n2 = f2.alternate;
              if (null !== n2) {
                var t2 = n2.child;
                if (null !== t2) {
                  n2.child = null;
                  do {
                    var J2 = t2.sibling;
                    t2.sibling = null;
                    t2 = J2;
                  } while (null !== t2);
                }
              }
              V = f2;
            }
          }
          if (0 !== (f2.subtreeFlags & 2064) && null !== g) g.return = f2, V = g;
          else b: for (; null !== V; ) {
            f2 = V;
            if (0 !== (f2.flags & 2048)) switch (f2.tag) {
              case 0:
              case 11:
              case 15:
                Pj(9, f2, f2.return);
            }
            var x2 = f2.sibling;
            if (null !== x2) {
              x2.return = f2.return;
              V = x2;
              break b;
            }
            V = f2.return;
          }
        }
        var w2 = a.current;
        for (V = w2; null !== V; ) {
          g = V;
          var u2 = g.child;
          if (0 !== (g.subtreeFlags & 2064) && null !== u2) u2.return = g, V = u2;
          else b: for (g = w2; null !== V; ) {
            h = V;
            if (0 !== (h.flags & 2048)) try {
              switch (h.tag) {
                case 0:
                case 11:
                case 15:
                  Qj(9, h);
              }
            } catch (na) {
              W(h, h.return, na);
            }
            if (h === g) {
              V = null;
              break b;
            }
            var F2 = h.sibling;
            if (null !== F2) {
              F2.return = h.return;
              V = F2;
              break b;
            }
            V = h.return;
          }
        }
        K = e;
        jg();
        if (lc && "function" === typeof lc.onPostCommitFiberRoot) try {
          lc.onPostCommitFiberRoot(kc, a);
        } catch (na) {
        }
        d = true;
      }
      return d;
    } finally {
      C = c, ok.transition = b;
    }
  }
  return false;
}
function Xk(a, b, c) {
  b = Ji(c, b);
  b = Ni(a, b, 1);
  a = nh(a, b, 1);
  b = R();
  null !== a && (Ac(a, 1, b), Dk(a, b));
}
function W(a, b, c) {
  if (3 === a.tag) Xk(a, a, c);
  else for (; null !== b; ) {
    if (3 === b.tag) {
      Xk(b, a, c);
      break;
    } else if (1 === b.tag) {
      var d = b.stateNode;
      if ("function" === typeof b.type.getDerivedStateFromError || "function" === typeof d.componentDidCatch && (null === Ri || !Ri.has(d))) {
        a = Ji(c, a);
        a = Qi(b, a, 1);
        b = nh(b, a, 1);
        a = R();
        null !== b && (Ac(b, 1, a), Dk(b, a));
        break;
      }
    }
    b = b.return;
  }
}
function Ti(a, b, c) {
  var d = a.pingCache;
  null !== d && d.delete(b);
  b = R();
  a.pingedLanes |= a.suspendedLanes & c;
  Q === a && (Z & c) === c && (4 === T || 3 === T && (Z & 130023424) === Z && 500 > B() - fk ? Kk(a, 0) : rk |= c);
  Dk(a, b);
}
function Yk(a, b) {
  0 === b && (0 === (a.mode & 1) ? b = 1 : (b = sc, sc <<= 1, 0 === (sc & 130023424) && (sc = 4194304)));
  var c = R();
  a = ih(a, b);
  null !== a && (Ac(a, b, c), Dk(a, c));
}
function uj(a) {
  var b = a.memoizedState, c = 0;
  null !== b && (c = b.retryLane);
  Yk(a, c);
}
function bk(a, b) {
  var c = 0;
  switch (a.tag) {
    case 13:
      var d = a.stateNode;
      var e = a.memoizedState;
      null !== e && (c = e.retryLane);
      break;
    case 19:
      d = a.stateNode;
      break;
    default:
      throw Error(p(314));
  }
  null !== d && d.delete(b);
  Yk(a, c);
}
var Vk;
Vk = function(a, b, c) {
  if (null !== a) if (a.memoizedProps !== b.pendingProps || Wf.current) dh = true;
  else {
    if (0 === (a.lanes & c) && 0 === (b.flags & 128)) return dh = false, yj(a, b, c);
    dh = 0 !== (a.flags & 131072) ? true : false;
  }
  else dh = false, I && 0 !== (b.flags & 1048576) && ug(b, ng, b.index);
  b.lanes = 0;
  switch (b.tag) {
    case 2:
      var d = b.type;
      ij(a, b);
      a = b.pendingProps;
      var e = Yf(b, H.current);
      ch(b, c);
      e = Nh(null, b, d, a, e, c);
      var f2 = Sh();
      b.flags |= 1;
      "object" === typeof e && null !== e && "function" === typeof e.render && void 0 === e.$$typeof ? (b.tag = 1, b.memoizedState = null, b.updateQueue = null, Zf(d) ? (f2 = true, cg(b)) : f2 = false, b.memoizedState = null !== e.state && void 0 !== e.state ? e.state : null, kh(b), e.updater = Ei, b.stateNode = e, e._reactInternals = b, Ii(b, d, a, c), b = jj(null, b, d, true, f2, c)) : (b.tag = 0, I && f2 && vg(b), Xi(null, b, e, c), b = b.child);
      return b;
    case 16:
      d = b.elementType;
      a: {
        ij(a, b);
        a = b.pendingProps;
        e = d._init;
        d = e(d._payload);
        b.type = d;
        e = b.tag = Zk(d);
        a = Ci(d, a);
        switch (e) {
          case 0:
            b = cj(null, b, d, a, c);
            break a;
          case 1:
            b = hj(null, b, d, a, c);
            break a;
          case 11:
            b = Yi(null, b, d, a, c);
            break a;
          case 14:
            b = $i(null, b, d, Ci(d.type, a), c);
            break a;
        }
        throw Error(p(
          306,
          d,
          ""
        ));
      }
      return b;
    case 0:
      return d = b.type, e = b.pendingProps, e = b.elementType === d ? e : Ci(d, e), cj(a, b, d, e, c);
    case 1:
      return d = b.type, e = b.pendingProps, e = b.elementType === d ? e : Ci(d, e), hj(a, b, d, e, c);
    case 3:
      a: {
        kj(b);
        if (null === a) throw Error(p(387));
        d = b.pendingProps;
        f2 = b.memoizedState;
        e = f2.element;
        lh(a, b);
        qh(b, d, null, c);
        var g = b.memoizedState;
        d = g.element;
        if (f2.isDehydrated) if (f2 = { element: d, isDehydrated: false, cache: g.cache, pendingSuspenseBoundaries: g.pendingSuspenseBoundaries, transitions: g.transitions }, b.updateQueue.baseState = f2, b.memoizedState = f2, b.flags & 256) {
          e = Ji(Error(p(423)), b);
          b = lj(a, b, d, c, e);
          break a;
        } else if (d !== e) {
          e = Ji(Error(p(424)), b);
          b = lj(a, b, d, c, e);
          break a;
        } else for (yg = Lf(b.stateNode.containerInfo.firstChild), xg = b, I = true, zg = null, c = Vg(b, null, d, c), b.child = c; c; ) c.flags = c.flags & -3 | 4096, c = c.sibling;
        else {
          Ig();
          if (d === e) {
            b = Zi(a, b, c);
            break a;
          }
          Xi(a, b, d, c);
        }
        b = b.child;
      }
      return b;
    case 5:
      return Ah(b), null === a && Eg(b), d = b.type, e = b.pendingProps, f2 = null !== a ? a.memoizedProps : null, g = e.children, Ef(d, e) ? g = null : null !== f2 && Ef(d, f2) && (b.flags |= 32), gj(a, b), Xi(a, b, g, c), b.child;
    case 6:
      return null === a && Eg(b), null;
    case 13:
      return oj(a, b, c);
    case 4:
      return yh(b, b.stateNode.containerInfo), d = b.pendingProps, null === a ? b.child = Ug(b, null, d, c) : Xi(a, b, d, c), b.child;
    case 11:
      return d = b.type, e = b.pendingProps, e = b.elementType === d ? e : Ci(d, e), Yi(a, b, d, e, c);
    case 7:
      return Xi(a, b, b.pendingProps, c), b.child;
    case 8:
      return Xi(a, b, b.pendingProps.children, c), b.child;
    case 12:
      return Xi(a, b, b.pendingProps.children, c), b.child;
    case 10:
      a: {
        d = b.type._context;
        e = b.pendingProps;
        f2 = b.memoizedProps;
        g = e.value;
        G(Wg, d._currentValue);
        d._currentValue = g;
        if (null !== f2) if (He(f2.value, g)) {
          if (f2.children === e.children && !Wf.current) {
            b = Zi(a, b, c);
            break a;
          }
        } else for (f2 = b.child, null !== f2 && (f2.return = b); null !== f2; ) {
          var h = f2.dependencies;
          if (null !== h) {
            g = f2.child;
            for (var k2 = h.firstContext; null !== k2; ) {
              if (k2.context === d) {
                if (1 === f2.tag) {
                  k2 = mh(-1, c & -c);
                  k2.tag = 2;
                  var l2 = f2.updateQueue;
                  if (null !== l2) {
                    l2 = l2.shared;
                    var m2 = l2.pending;
                    null === m2 ? k2.next = k2 : (k2.next = m2.next, m2.next = k2);
                    l2.pending = k2;
                  }
                }
                f2.lanes |= c;
                k2 = f2.alternate;
                null !== k2 && (k2.lanes |= c);
                bh(
                  f2.return,
                  c,
                  b
                );
                h.lanes |= c;
                break;
              }
              k2 = k2.next;
            }
          } else if (10 === f2.tag) g = f2.type === b.type ? null : f2.child;
          else if (18 === f2.tag) {
            g = f2.return;
            if (null === g) throw Error(p(341));
            g.lanes |= c;
            h = g.alternate;
            null !== h && (h.lanes |= c);
            bh(g, c, b);
            g = f2.sibling;
          } else g = f2.child;
          if (null !== g) g.return = f2;
          else for (g = f2; null !== g; ) {
            if (g === b) {
              g = null;
              break;
            }
            f2 = g.sibling;
            if (null !== f2) {
              f2.return = g.return;
              g = f2;
              break;
            }
            g = g.return;
          }
          f2 = g;
        }
        Xi(a, b, e.children, c);
        b = b.child;
      }
      return b;
    case 9:
      return e = b.type, d = b.pendingProps.children, ch(b, c), e = eh(e), d = d(e), b.flags |= 1, Xi(a, b, d, c), b.child;
    case 14:
      return d = b.type, e = Ci(d, b.pendingProps), e = Ci(d.type, e), $i(a, b, d, e, c);
    case 15:
      return bj(a, b, b.type, b.pendingProps, c);
    case 17:
      return d = b.type, e = b.pendingProps, e = b.elementType === d ? e : Ci(d, e), ij(a, b), b.tag = 1, Zf(d) ? (a = true, cg(b)) : a = false, ch(b, c), Gi(b, d, e), Ii(b, d, e, c), jj(null, b, d, true, a, c);
    case 19:
      return xj(a, b, c);
    case 22:
      return dj(a, b, c);
  }
  throw Error(p(156, b.tag));
};
function Fk(a, b) {
  return ac(a, b);
}
function $k(a, b, c, d) {
  this.tag = a;
  this.key = c;
  this.sibling = this.child = this.return = this.stateNode = this.type = this.elementType = null;
  this.index = 0;
  this.ref = null;
  this.pendingProps = b;
  this.dependencies = this.memoizedState = this.updateQueue = this.memoizedProps = null;
  this.mode = d;
  this.subtreeFlags = this.flags = 0;
  this.deletions = null;
  this.childLanes = this.lanes = 0;
  this.alternate = null;
}
function Bg(a, b, c, d) {
  return new $k(a, b, c, d);
}
function aj(a) {
  a = a.prototype;
  return !(!a || !a.isReactComponent);
}
function Zk(a) {
  if ("function" === typeof a) return aj(a) ? 1 : 0;
  if (void 0 !== a && null !== a) {
    a = a.$$typeof;
    if (a === Da) return 11;
    if (a === Ga) return 14;
  }
  return 2;
}
function Pg(a, b) {
  var c = a.alternate;
  null === c ? (c = Bg(a.tag, b, a.key, a.mode), c.elementType = a.elementType, c.type = a.type, c.stateNode = a.stateNode, c.alternate = a, a.alternate = c) : (c.pendingProps = b, c.type = a.type, c.flags = 0, c.subtreeFlags = 0, c.deletions = null);
  c.flags = a.flags & 14680064;
  c.childLanes = a.childLanes;
  c.lanes = a.lanes;
  c.child = a.child;
  c.memoizedProps = a.memoizedProps;
  c.memoizedState = a.memoizedState;
  c.updateQueue = a.updateQueue;
  b = a.dependencies;
  c.dependencies = null === b ? null : { lanes: b.lanes, firstContext: b.firstContext };
  c.sibling = a.sibling;
  c.index = a.index;
  c.ref = a.ref;
  return c;
}
function Rg(a, b, c, d, e, f2) {
  var g = 2;
  d = a;
  if ("function" === typeof a) aj(a) && (g = 1);
  else if ("string" === typeof a) g = 5;
  else a: switch (a) {
    case ya:
      return Tg(c.children, e, f2, b);
    case za:
      g = 8;
      e |= 8;
      break;
    case Aa:
      return a = Bg(12, c, b, e | 2), a.elementType = Aa, a.lanes = f2, a;
    case Ea:
      return a = Bg(13, c, b, e), a.elementType = Ea, a.lanes = f2, a;
    case Fa:
      return a = Bg(19, c, b, e), a.elementType = Fa, a.lanes = f2, a;
    case Ia:
      return pj(c, e, f2, b);
    default:
      if ("object" === typeof a && null !== a) switch (a.$$typeof) {
        case Ba:
          g = 10;
          break a;
        case Ca:
          g = 9;
          break a;
        case Da:
          g = 11;
          break a;
        case Ga:
          g = 14;
          break a;
        case Ha:
          g = 16;
          d = null;
          break a;
      }
      throw Error(p(130, null == a ? a : typeof a, ""));
  }
  b = Bg(g, c, b, e);
  b.elementType = a;
  b.type = d;
  b.lanes = f2;
  return b;
}
function Tg(a, b, c, d) {
  a = Bg(7, a, d, b);
  a.lanes = c;
  return a;
}
function pj(a, b, c, d) {
  a = Bg(22, a, d, b);
  a.elementType = Ia;
  a.lanes = c;
  a.stateNode = { isHidden: false };
  return a;
}
function Qg(a, b, c) {
  a = Bg(6, a, null, b);
  a.lanes = c;
  return a;
}
function Sg(a, b, c) {
  b = Bg(4, null !== a.children ? a.children : [], a.key, b);
  b.lanes = c;
  b.stateNode = { containerInfo: a.containerInfo, pendingChildren: null, implementation: a.implementation };
  return b;
}
function al(a, b, c, d, e) {
  this.tag = b;
  this.containerInfo = a;
  this.finishedWork = this.pingCache = this.current = this.pendingChildren = null;
  this.timeoutHandle = -1;
  this.callbackNode = this.pendingContext = this.context = null;
  this.callbackPriority = 0;
  this.eventTimes = zc(0);
  this.expirationTimes = zc(-1);
  this.entangledLanes = this.finishedLanes = this.mutableReadLanes = this.expiredLanes = this.pingedLanes = this.suspendedLanes = this.pendingLanes = 0;
  this.entanglements = zc(0);
  this.identifierPrefix = d;
  this.onRecoverableError = e;
  this.mutableSourceEagerHydrationData = null;
}
function bl(a, b, c, d, e, f2, g, h, k2) {
  a = new al(a, b, c, h, k2);
  1 === b ? (b = 1, true === f2 && (b |= 8)) : b = 0;
  f2 = Bg(3, null, null, b);
  a.current = f2;
  f2.stateNode = a;
  f2.memoizedState = { element: d, isDehydrated: c, cache: null, transitions: null, pendingSuspenseBoundaries: null };
  kh(f2);
  return a;
}
function cl(a, b, c) {
  var d = 3 < arguments.length && void 0 !== arguments[3] ? arguments[3] : null;
  return { $$typeof: wa, key: null == d ? null : "" + d, children: a, containerInfo: b, implementation: c };
}
function dl(a) {
  if (!a) return Vf;
  a = a._reactInternals;
  a: {
    if (Vb(a) !== a || 1 !== a.tag) throw Error(p(170));
    var b = a;
    do {
      switch (b.tag) {
        case 3:
          b = b.stateNode.context;
          break a;
        case 1:
          if (Zf(b.type)) {
            b = b.stateNode.__reactInternalMemoizedMergedChildContext;
            break a;
          }
      }
      b = b.return;
    } while (null !== b);
    throw Error(p(171));
  }
  if (1 === a.tag) {
    var c = a.type;
    if (Zf(c)) return bg(a, c, b);
  }
  return b;
}
function el(a, b, c, d, e, f2, g, h, k2) {
  a = bl(c, d, true, a, e, f2, g, h, k2);
  a.context = dl(null);
  c = a.current;
  d = R();
  e = yi(c);
  f2 = mh(d, e);
  f2.callback = void 0 !== b && null !== b ? b : null;
  nh(c, f2, e);
  a.current.lanes = e;
  Ac(a, e, d);
  Dk(a, d);
  return a;
}
function fl(a, b, c, d) {
  var e = b.current, f2 = R(), g = yi(e);
  c = dl(c);
  null === b.context ? b.context = c : b.pendingContext = c;
  b = mh(f2, g);
  b.payload = { element: a };
  d = void 0 === d ? null : d;
  null !== d && (b.callback = d);
  a = nh(e, b, g);
  null !== a && (gi(a, e, g, f2), oh(a, e, g));
  return g;
}
function gl(a) {
  a = a.current;
  if (!a.child) return null;
  switch (a.child.tag) {
    case 5:
      return a.child.stateNode;
    default:
      return a.child.stateNode;
  }
}
function hl(a, b) {
  a = a.memoizedState;
  if (null !== a && null !== a.dehydrated) {
    var c = a.retryLane;
    a.retryLane = 0 !== c && c < b ? c : b;
  }
}
function il(a, b) {
  hl(a, b);
  (a = a.alternate) && hl(a, b);
}
function jl() {
  return null;
}
var kl = "function" === typeof reportError ? reportError : function(a) {
  console.error(a);
};
function ll(a) {
  this._internalRoot = a;
}
ml.prototype.render = ll.prototype.render = function(a) {
  var b = this._internalRoot;
  if (null === b) throw Error(p(409));
  fl(a, b, null, null);
};
ml.prototype.unmount = ll.prototype.unmount = function() {
  var a = this._internalRoot;
  if (null !== a) {
    this._internalRoot = null;
    var b = a.containerInfo;
    Rk(function() {
      fl(null, a, null, null);
    });
    b[uf] = null;
  }
};
function ml(a) {
  this._internalRoot = a;
}
ml.prototype.unstable_scheduleHydration = function(a) {
  if (a) {
    var b = Hc();
    a = { blockedOn: null, target: a, priority: b };
    for (var c = 0; c < Qc.length && 0 !== b && b < Qc[c].priority; c++) ;
    Qc.splice(c, 0, a);
    0 === c && Vc(a);
  }
};
function nl(a) {
  return !(!a || 1 !== a.nodeType && 9 !== a.nodeType && 11 !== a.nodeType);
}
function ol(a) {
  return !(!a || 1 !== a.nodeType && 9 !== a.nodeType && 11 !== a.nodeType && (8 !== a.nodeType || " react-mount-point-unstable " !== a.nodeValue));
}
function pl() {
}
function ql(a, b, c, d, e) {
  if (e) {
    if ("function" === typeof d) {
      var f2 = d;
      d = function() {
        var a2 = gl(g);
        f2.call(a2);
      };
    }
    var g = el(b, d, a, 0, null, false, false, "", pl);
    a._reactRootContainer = g;
    a[uf] = g.current;
    sf(8 === a.nodeType ? a.parentNode : a);
    Rk();
    return g;
  }
  for (; e = a.lastChild; ) a.removeChild(e);
  if ("function" === typeof d) {
    var h = d;
    d = function() {
      var a2 = gl(k2);
      h.call(a2);
    };
  }
  var k2 = bl(a, 0, false, null, null, false, false, "", pl);
  a._reactRootContainer = k2;
  a[uf] = k2.current;
  sf(8 === a.nodeType ? a.parentNode : a);
  Rk(function() {
    fl(b, k2, c, d);
  });
  return k2;
}
function rl(a, b, c, d, e) {
  var f2 = c._reactRootContainer;
  if (f2) {
    var g = f2;
    if ("function" === typeof e) {
      var h = e;
      e = function() {
        var a2 = gl(g);
        h.call(a2);
      };
    }
    fl(b, g, a, e);
  } else g = ql(c, b, a, e, d);
  return gl(g);
}
Ec = function(a) {
  switch (a.tag) {
    case 3:
      var b = a.stateNode;
      if (b.current.memoizedState.isDehydrated) {
        var c = tc(b.pendingLanes);
        0 !== c && (Cc(b, c | 1), Dk(b, B()), 0 === (K & 6) && (Gj = B() + 500, jg()));
      }
      break;
    case 13:
      Rk(function() {
        var b2 = ih(a, 1);
        if (null !== b2) {
          var c2 = R();
          gi(b2, a, 1, c2);
        }
      }), il(a, 1);
  }
};
Fc = function(a) {
  if (13 === a.tag) {
    var b = ih(a, 134217728);
    if (null !== b) {
      var c = R();
      gi(b, a, 134217728, c);
    }
    il(a, 134217728);
  }
};
Gc = function(a) {
  if (13 === a.tag) {
    var b = yi(a), c = ih(a, b);
    if (null !== c) {
      var d = R();
      gi(c, a, b, d);
    }
    il(a, b);
  }
};
Hc = function() {
  return C;
};
Ic = function(a, b) {
  var c = C;
  try {
    return C = a, b();
  } finally {
    C = c;
  }
};
yb = function(a, b, c) {
  switch (b) {
    case "input":
      bb(a, c);
      b = c.name;
      if ("radio" === c.type && null != b) {
        for (c = a; c.parentNode; ) c = c.parentNode;
        c = c.querySelectorAll("input[name=" + JSON.stringify("" + b) + '][type="radio"]');
        for (b = 0; b < c.length; b++) {
          var d = c[b];
          if (d !== a && d.form === a.form) {
            var e = Db(d);
            if (!e) throw Error(p(90));
            Wa(d);
            bb(d, e);
          }
        }
      }
      break;
    case "textarea":
      ib(a, c);
      break;
    case "select":
      b = c.value, null != b && fb(a, !!c.multiple, b, false);
  }
};
Gb = Qk;
Hb = Rk;
var sl = { usingClientEntryPoint: false, Events: [Cb, ue, Db, Eb, Fb, Qk] }, tl = { findFiberByHostInstance: Wc, bundleType: 0, version: "18.3.1", rendererPackageName: "react-dom" };
var ul = { bundleType: tl.bundleType, version: tl.version, rendererPackageName: tl.rendererPackageName, rendererConfig: tl.rendererConfig, overrideHookState: null, overrideHookStateDeletePath: null, overrideHookStateRenamePath: null, overrideProps: null, overridePropsDeletePath: null, overridePropsRenamePath: null, setErrorHandler: null, setSuspenseHandler: null, scheduleUpdate: null, currentDispatcherRef: ua.ReactCurrentDispatcher, findHostInstanceByFiber: function(a) {
  a = Zb(a);
  return null === a ? null : a.stateNode;
}, findFiberByHostInstance: tl.findFiberByHostInstance || jl, findHostInstancesForRefresh: null, scheduleRefresh: null, scheduleRoot: null, setRefreshHandler: null, getCurrentFiber: null, reconcilerVersion: "18.3.1-next-f1338f8080-20240426" };
if ("undefined" !== typeof __REACT_DEVTOOLS_GLOBAL_HOOK__) {
  var vl = __REACT_DEVTOOLS_GLOBAL_HOOK__;
  if (!vl.isDisabled && vl.supportsFiber) try {
    kc = vl.inject(ul), lc = vl;
  } catch (a) {
  }
}
reactDom_production_min.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED = sl;
reactDom_production_min.createPortal = function(a, b) {
  var c = 2 < arguments.length && void 0 !== arguments[2] ? arguments[2] : null;
  if (!nl(b)) throw Error(p(200));
  return cl(a, b, null, c);
};
reactDom_production_min.createRoot = function(a, b) {
  if (!nl(a)) throw Error(p(299));
  var c = false, d = "", e = kl;
  null !== b && void 0 !== b && (true === b.unstable_strictMode && (c = true), void 0 !== b.identifierPrefix && (d = b.identifierPrefix), void 0 !== b.onRecoverableError && (e = b.onRecoverableError));
  b = bl(a, 1, false, null, null, c, false, d, e);
  a[uf] = b.current;
  sf(8 === a.nodeType ? a.parentNode : a);
  return new ll(b);
};
reactDom_production_min.findDOMNode = function(a) {
  if (null == a) return null;
  if (1 === a.nodeType) return a;
  var b = a._reactInternals;
  if (void 0 === b) {
    if ("function" === typeof a.render) throw Error(p(188));
    a = Object.keys(a).join(",");
    throw Error(p(268, a));
  }
  a = Zb(b);
  a = null === a ? null : a.stateNode;
  return a;
};
reactDom_production_min.flushSync = function(a) {
  return Rk(a);
};
reactDom_production_min.hydrate = function(a, b, c) {
  if (!ol(b)) throw Error(p(200));
  return rl(null, a, b, true, c);
};
reactDom_production_min.hydrateRoot = function(a, b, c) {
  if (!nl(a)) throw Error(p(405));
  var d = null != c && c.hydratedSources || null, e = false, f2 = "", g = kl;
  null !== c && void 0 !== c && (true === c.unstable_strictMode && (e = true), void 0 !== c.identifierPrefix && (f2 = c.identifierPrefix), void 0 !== c.onRecoverableError && (g = c.onRecoverableError));
  b = el(b, null, a, 1, null != c ? c : null, e, false, f2, g);
  a[uf] = b.current;
  sf(a);
  if (d) for (a = 0; a < d.length; a++) c = d[a], e = c._getVersion, e = e(c._source), null == b.mutableSourceEagerHydrationData ? b.mutableSourceEagerHydrationData = [c, e] : b.mutableSourceEagerHydrationData.push(
    c,
    e
  );
  return new ml(b);
};
reactDom_production_min.render = function(a, b, c) {
  if (!ol(b)) throw Error(p(200));
  return rl(null, a, b, false, c);
};
reactDom_production_min.unmountComponentAtNode = function(a) {
  if (!ol(a)) throw Error(p(40));
  return a._reactRootContainer ? (Rk(function() {
    rl(null, null, a, false, function() {
      a._reactRootContainer = null;
      a[uf] = null;
    });
  }), true) : false;
};
reactDom_production_min.unstable_batchedUpdates = Qk;
reactDom_production_min.unstable_renderSubtreeIntoContainer = function(a, b, c, d) {
  if (!ol(c)) throw Error(p(200));
  if (null == a || void 0 === a._reactInternals) throw Error(p(38));
  return rl(a, b, c, false, d);
};
reactDom_production_min.version = "18.3.1-next-f1338f8080-20240426";
function checkDCE() {
  if (typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ === "undefined" || typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE !== "function") {
    return;
  }
  try {
    __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE(checkDCE);
  } catch (err) {
    console.error(err);
  }
}
{
  checkDCE();
  reactDom.exports = reactDom_production_min;
}
var reactDomExports = reactDom.exports;
var createRoot;
var m = reactDomExports;
{
  createRoot = m.createRoot;
  m.hydrateRoot;
}
const PERSONALITY_PRESETS = [
  { id: "default", label: "Default", prompt: "" },
  {
    id: "cheerful",
    label: "Cheerful",
    prompt: "Adopt a warm, upbeat, encouraging tone. Celebrate small wins and keep morale high, while staying technically accurate and concise."
  },
  {
    id: "terse",
    label: "Terse",
    prompt: "Be extremely concise. Prefer short sentences and fragments. No filler, no preamble."
  },
  {
    id: "mentor",
    label: "Mentor",
    prompt: "Explain your reasoning like a patient mentor: briefly say why before what, and point out one thing the user can learn from each change."
  },
  {
    id: "playful",
    label: "Playful",
    prompt: "Be witty and a little playful, with the occasional light joke — never at the cost of accuracy."
  }
];
function mergePersonas(custom) {
  const byId = new Map(PERSONALITY_PRESETS.map((p2) => [p2.id, p2]));
  for (const p2 of custom) byId.set(p2.id, p2);
  return [...byId.values()];
}
const TOOL_ACTIVITY = {
  Edit: "editing files",
  MultiEdit: "editing files",
  Write: "writing a file",
  NotebookEdit: "editing a notebook",
  Read: "reading files",
  NotebookRead: "reading a notebook",
  Bash: "running a command",
  Grep: "searching the code",
  Glob: "searching the code",
  LS: "looking around",
  WebFetch: "browsing the web",
  WebSearch: "searching the web",
  Task: "spawning a subagent",
  TodoWrite: "planning"
};
function describeActivity(source) {
  if (!source) return null;
  const tool = source.split(":")[1];
  if (!tool) return null;
  return TOOL_ACTIVITY[tool] ?? `using ${tool}`;
}
const EMOTIONS = [
  "neutral",
  "happy",
  "sad",
  "surprised",
  "angry",
  "excited",
  "thinking"
];
const TAG_BODY = EMOTIONS.join("|");
function stripEmotionTags(text) {
  const emotions = [];
  const re2 = new RegExp(`\\[(${TAG_BODY})\\]`, "gi");
  const clean = text.replace(re2, (_m, e) => {
    emotions.push(e.toLowerCase());
    return "";
  });
  return { clean, emotions };
}
const MAX_TAG_LEN = 12;
function splitForTagStream(carry, chunk) {
  const buf = carry + chunk;
  let scan = buf;
  let nextCarry = "";
  const lastOpen = buf.lastIndexOf("[");
  if (lastOpen !== -1) {
    const tail = buf.slice(lastOpen);
    if (tail.length <= MAX_TAG_LEN && /^\[[a-z]*$/i.test(tail)) {
      scan = buf.slice(0, lastOpen);
      nextCarry = tail;
    }
  }
  const { clean, emotions } = stripEmotionTags(scan);
  return { text: clean, emotions, carry: nextCarry };
}
const MAX_SPEAK_CHARS = 600;
function cleanForSpeech(text) {
  let s = stripEmotionTags(text).clean;
  s = s.replace(/```[\s\S]*?```/g, " ");
  s = s.replace(/`[^`]*`/g, " ");
  s = s.replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1");
  s = s.replace(/https?:\/\/\S+/g, " ");
  s = s.replace(/[*_#>~|]/g, " ");
  s = s.replace(/\s+/g, " ").trim();
  if (s.length <= MAX_SPEAK_CHARS) return s;
  const window2 = s.slice(0, MAX_SPEAK_CHARS);
  const lastStop = Math.max(
    window2.lastIndexOf(". "),
    window2.lastIndexOf("! "),
    window2.lastIndexOf("? ")
  );
  return (lastStop > 200 ? window2.slice(0, lastStop + 1) : window2).trim();
}
const scriptRel = function detectScriptRel() {
  const relList = typeof document !== "undefined" && document.createElement("link").relList;
  return relList && relList.supports && relList.supports("modulepreload") ? "modulepreload" : "preload";
}();
const assetsURL = function(dep, importerUrl) {
  return new URL(dep, importerUrl).href;
};
const seen = {};
const __vitePreload = function preload(baseModule, deps, importerUrl) {
  let promise = Promise.resolve();
  if (deps && deps.length > 0) {
    const links = document.getElementsByTagName("link");
    const cspNonceMeta = document.querySelector(
      "meta[property=csp-nonce]"
    );
    const cspNonce = cspNonceMeta?.nonce || cspNonceMeta?.getAttribute("nonce");
    promise = Promise.allSettled(
      deps.map((dep) => {
        dep = assetsURL(dep, importerUrl);
        if (dep in seen) return;
        seen[dep] = true;
        const isCss = dep.endsWith(".css");
        const cssSelector = isCss ? '[rel="stylesheet"]' : "";
        const isBaseRelative = !!importerUrl;
        if (isBaseRelative) {
          for (let i = links.length - 1; i >= 0; i--) {
            const link2 = links[i];
            if (link2.href === dep && (!isCss || link2.rel === "stylesheet")) {
              return;
            }
          }
        } else if (document.querySelector(`link[href="${dep}"]${cssSelector}`)) {
          return;
        }
        const link = document.createElement("link");
        link.rel = isCss ? "stylesheet" : scriptRel;
        if (!isCss) {
          link.as = "script";
        }
        link.crossOrigin = "";
        link.href = dep;
        if (cspNonce) {
          link.setAttribute("nonce", cspNonce);
        }
        document.head.appendChild(link);
        if (isCss) {
          return new Promise((res, rej) => {
            link.addEventListener("load", res);
            link.addEventListener(
              "error",
              () => rej(new Error(`Unable to preload CSS for ${dep}`))
            );
          });
        }
      })
    );
  }
  function handlePreloadError(err) {
    const e = new Event("vite:preloadError", {
      cancelable: true
    });
    e.payload = err;
    window.dispatchEvent(e);
    if (!e.defaultPrevented) {
      throw err;
    }
  }
  return promise.then((res) => {
    for (const item of res || []) {
      if (item.status !== "rejected") continue;
      handlePreloadError(item.reason);
    }
    return baseModule().catch(handlePreloadError);
  });
};
const CUBISM_CORE_URL = "companion-model://m/runtime/live2dcubismcore.min.js";
async function ensureCubismCore() {
  if (window.Live2DCubismCore) return;
  await new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = CUBISM_CORE_URL;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Cubism Core runtime not found (resources/runtime)"));
    document.head.appendChild(script);
  });
  if (!window.Live2DCubismCore) throw new Error("Cubism Core failed to initialize");
}
const POSE_MOTION = {
  idle: "Idle",
  listening: "Idle",
  thinking: "Idle",
  working: "TapBody",
  speaking: "Idle",
  alert: "TapBody"
};
class Live2DController {
  constructor(modelUrl, maps = {}) {
    this.modelUrl = modelUrl;
    this.maps = maps;
    this.app = null;
    this.model = null;
    this.host = null;
    this.resizeObserver = null;
  }
  async mount(host) {
    await ensureCubismCore();
    const PIXI = await __vitePreload(() => import("./pixi-CkHiphy-.js"), true ? __vite__mapDeps([0,1]) : void 0, import.meta.url);
    const { install } = await __vitePreload(async () => {
      const { install: install2 } = await import("./unsafe-eval-B_W8V3eq.js");
      return { install: install2 };
    }, true ? [] : void 0, import.meta.url);
    install(PIXI);
    const mod = await __vitePreload(() => import("./cubism4.es-B88CTxaG.js"), true ? __vite__mapDeps([2,1]) : void 0, import.meta.url);
    const Live2DModel = mod.Live2DModel;
    window.PIXI = PIXI;
    Live2DModel.registerTicker?.(PIXI.Ticker);
    const canvas = document.createElement("canvas");
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    host.appendChild(canvas);
    this.host = host;
    const app = new PIXI.Application({
      view: canvas,
      resizeTo: host,
      backgroundAlpha: 0,
      // transparent — character floats on the desktop
      antialias: true,
      autoDensity: true,
      resolution: window.devicePixelRatio || 1
    });
    this.app = app;
    const model = await Live2DModel.from(this.modelUrl);
    this.model = model;
    app.stage.addChild(model);
    this.fit();
    this.resizeObserver = new ResizeObserver(() => this.fit());
    this.resizeObserver.observe(host);
  }
  fit() {
    if (!this.model || !this.host) return;
    const w2 = this.host.clientWidth;
    const h = this.host.clientHeight;
    if (!w2 || !h) return;
    this.model.scale.set(1);
    const natW = this.model.width || 1;
    const natH = this.model.height || 1;
    const t2 = this.maps.transform ?? {};
    const scale = Math.min(w2 / natW, h / natH) * 0.9 * (t2.scale ?? 1);
    this.model.anchor?.set?.(0.5, 0.5);
    this.model.scale.set(scale);
    this.model.x = w2 / 2 + (t2.x ?? 0) * w2;
    this.model.y = h / 2 + (t2.y ?? 0) * h;
  }
  setPose(pose) {
    const group = this.maps.motionMap?.[pose] ?? POSE_MOTION[pose];
    try {
      this.model?.motion?.(group);
    } catch {
    }
  }
  setExpression(expression) {
    const target = this.maps.expressionMap?.[expression] ?? expression;
    try {
      this.model?.expression?.(target);
    } catch {
    }
  }
  setSpeaking(active) {
    if (!active) this.setMouthOpen(0);
  }
  setMouthOpen(value) {
    try {
      const core = this.model?.internalModel?.coreModel;
      core?.setParameterValueById?.("ParamMouthOpenY", Math.max(0, Math.min(1, value)));
    } catch {
    }
  }
  lookAt(clientX, clientY) {
    this.model?.focus?.(clientX, clientY);
  }
  poke() {
    try {
      this.model?.motion?.("TapBody");
    } catch {
    }
  }
  destroy() {
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    try {
      this.app?.destroy(true, { children: true });
    } catch {
    }
    this.app = null;
    this.model = null;
  }
}
const POSE_STYLES = {
  idle: { body: "#f0a868", glow: "rgba(240,168,104,0.35)", energy: 1 },
  listening: { body: "#7fc8a9", glow: "rgba(127,200,169,0.45)", energy: 1.6 },
  thinking: { body: "#9d8df0", glow: "rgba(157,141,240,0.4)", energy: 1.2 },
  working: { body: "#5fb0e8", glow: "rgba(95,176,232,0.5)", energy: 2.4 },
  speaking: { body: "#f08fb0", glow: "rgba(240,143,176,0.45)", energy: 1.8 },
  alert: { body: "#f0c14b", glow: "rgba(240,193,75,0.6)", energy: 2.8 }
};
class PlaceholderController {
  constructor() {
    this.canvas = null;
    this.ctx = null;
    this.raf = 0;
    this.startMs = 0;
    this.t = 0;
    this.pose = "idle";
    this.dpr = 1;
    this.gaze = { x: 0, y: 0 };
    this.gazeCurrent = { x: 0, y: 0 };
    this.nextBlinkAt = 1.5;
    this.blink = 0;
    this.blinking = false;
    this.pokeUntil = 0;
    this.expression = "neutral";
    this.speaking = false;
    this.mouthOpen = 0;
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.loop = () => {
      this.raf = requestAnimationFrame(this.loop);
      const ctx = this.ctx;
      const canvas = this.canvas;
      if (!ctx || !canvas) return;
      const now = performance.now();
      this.t = (now - this.startMs) / 1e3;
      const style = POSE_STYLES[this.pose];
      this.gazeCurrent.x += (this.gaze.x - this.gazeCurrent.x) * 0.12;
      this.gazeCurrent.y += (this.gaze.y - this.gazeCurrent.y) * 0.12;
      if (!this.blinking && this.t >= this.nextBlinkAt) {
        this.blinking = true;
        this.blink = 0;
      }
      if (this.blinking) {
        this.blink += 0.18;
        if (this.blink >= 2) {
          this.blinking = false;
          this.blink = 0;
          this.nextBlinkAt = this.t + (Math.random() < 0.2 ? 0.16 : 2 + Math.random() * 3);
        }
      }
      const eyeOpen = this.blinking ? Math.abs(1 - this.blink) : 1;
      const w2 = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w2, h);
      ctx.save();
      ctx.scale(this.dpr, this.dpr);
      const vw = w2 / this.dpr;
      const vh2 = h / this.dpr;
      const cx = vw / 2;
      const groundY = vh2 * 0.82;
      const breath = Math.sin(this.t * style.energy * 1.4);
      const sway = Math.sin(this.t * 0.7) * 4;
      const pokeBoost = this.t < this.pokeUntil ? Math.sin((this.pokeUntil - this.t) * 20) * 8 : 0;
      const baseR = Math.min(vw, vh2) * 0.22;
      const bodyR = baseR;
      const squashY = 1 + breath * 0.04;
      const squashX = 1 - breath * 0.03;
      const cy = groundY - bodyR * squashY - 6 - pokeBoost;
      this.drawShadow(ctx, cx + sway, groundY + bodyR * 0.15, bodyR * (1.1 + breath * 0.05));
      this.drawGlow(ctx, cx + sway, cy, bodyR * 1.7, style.glow);
      this.drawBody(ctx, cx + sway, cy, bodyR, squashX, squashY, style.body);
      this.drawFace(ctx, cx + sway, cy, bodyR, eyeOpen);
      ctx.restore();
    };
  }
  async mount(host) {
    const canvas = document.createElement("canvas");
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.style.display = "block";
    host.appendChild(canvas);
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.resize();
    this.resizeObserver.observe(host);
    this.startMs = performance.now();
    this.loop();
  }
  resize() {
    if (!this.canvas) return;
    const rect = this.canvas.getBoundingClientRect();
    this.dpr = window.devicePixelRatio || 1;
    this.canvas.width = Math.max(1, Math.floor(rect.width * this.dpr));
    this.canvas.height = Math.max(1, Math.floor(rect.height * this.dpr));
  }
  setPose(pose) {
    this.pose = pose;
  }
  setExpression(expression) {
    this.expression = expression;
  }
  setSpeaking(active) {
    this.speaking = active;
    if (!active) this.mouthOpen = 0;
  }
  setMouthOpen(value) {
    this.mouthOpen = clamp(value, 0, 1);
  }
  lookAt(clientX, clientY) {
    if (!this.canvas) return;
    const r2 = this.canvas.getBoundingClientRect();
    const cx = r2.left + r2.width / 2;
    const cy = r2.top + r2.height * 0.42;
    this.gaze.x = clamp((clientX - cx) / (r2.width / 2), -1, 1);
    this.gaze.y = clamp((clientY - cy) / (r2.height / 2), -1, 1);
  }
  poke() {
    this.pokeUntil = this.t + 0.45;
    this.blinking = true;
    this.blink = 0;
  }
  destroy() {
    cancelAnimationFrame(this.raf);
    this.resizeObserver.disconnect();
    this.canvas?.remove();
    this.canvas = null;
    this.ctx = null;
  }
  drawShadow(ctx, x2, y2, r2) {
    ctx.save();
    ctx.translate(x2, y2);
    ctx.scale(1, 0.28);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r2);
    g.addColorStop(0, "rgba(0,0,0,0.32)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, r2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  drawGlow(ctx, x2, y2, r2, color) {
    const g = ctx.createRadialGradient(x2, y2, r2 * 0.2, x2, y2, r2);
    g.addColorStop(0, color);
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x2, y2, r2, 0, Math.PI * 2);
    ctx.fill();
  }
  drawBody(ctx, x2, y2, r2, sx, sy, color) {
    ctx.save();
    ctx.translate(x2, y2);
    ctx.scale(sx, sy);
    const g = ctx.createLinearGradient(0, -r2, 0, r2);
    g.addColorStop(0, lighten(color, 0.18));
    g.addColorStop(1, color);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(-r2, 0);
    ctx.bezierCurveTo(-r2, -r2 * 1.25, r2, -r2 * 1.25, r2, 0);
    ctx.bezierCurveTo(r2, r2 * 0.95, -r2, r2 * 0.95, -r2, 0);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.22)";
    ctx.beginPath();
    ctx.ellipse(-r2 * 0.28, -r2 * 0.5, r2 * 0.32, r2 * 0.18, -0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  drawFace(ctx, x2, y2, r2, eyeOpen) {
    const f2 = FACES[this.expression] ?? FACES.neutral;
    const ink = "#2a2433";
    const gx = this.gazeCurrent.x * r2 * 0.12;
    const gy = this.gazeCurrent.y * r2 * 0.1;
    const eyeDX = r2 * 0.34;
    const eyeY = y2 - r2 * 0.1;
    const eyeR = r2 * 0.12 * f2.eyeScale;
    const lw = Math.max(1.5, r2 * 0.045);
    if (f2.brow !== 0) {
      ctx.strokeStyle = ink;
      ctx.lineWidth = lw;
      ctx.lineCap = "round";
      for (const dir of [-1, 1]) {
        const bx = x2 + dir * eyeDX + gx;
        const by = eyeY - r2 * 0.26 + gy;
        ctx.beginPath();
        ctx.moveTo(bx - dir * r2 * 0.1, by + dir * f2.brow * r2 * 0.07);
        ctx.lineTo(bx + dir * r2 * 0.1, by - dir * f2.brow * r2 * 0.07);
        ctx.stroke();
      }
    }
    ctx.fillStyle = ink;
    for (const dir of [-1, 1]) {
      const ex = x2 + dir * eyeDX + gx;
      const ey = eyeY + gy;
      if (f2.happyEyes && eyeOpen > 0.5) {
        ctx.strokeStyle = ink;
        ctx.lineWidth = lw;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.arc(ex, ey + eyeR * 0.4, eyeR * 1.1, 1.15 * Math.PI, 1.85 * Math.PI);
        ctx.stroke();
        continue;
      }
      ctx.save();
      ctx.translate(ex, ey);
      ctx.scale(1, Math.max(0.08, eyeOpen));
      ctx.beginPath();
      ctx.arc(0, 0, eyeR, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.85)";
      ctx.beginPath();
      ctx.arc(eyeR * 0.35, -eyeR * 0.35, eyeR * 0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = ink;
      ctx.restore();
    }
    ctx.fillStyle = "rgba(240,120,150,0.35)";
    for (const dir of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(x2 + dir * r2 * 0.5, y2 + r2 * 0.12, r2 * 0.12, r2 * 0.07, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    const mx = x2 + gx;
    const my = y2 + r2 * 0.1 + gy;
    if (this.speaking) {
      const open = 0.12 + this.mouthOpen * 0.9;
      ctx.fillStyle = ink;
      ctx.beginPath();
      ctx.ellipse(mx, my, r2 * 0.11, r2 * 0.14 * open, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (f2.mouthOpen > 0.3) {
      ctx.fillStyle = ink;
      ctx.beginPath();
      ctx.ellipse(mx, my, r2 * 0.1, r2 * 0.13 * f2.mouthOpen, 0, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.strokeStyle = ink;
      ctx.lineWidth = lw;
      ctx.lineCap = "round";
      const w2 = r2 * 0.13;
      const c = f2.mouthCurve * r2 * 0.12;
      ctx.beginPath();
      ctx.moveTo(mx - w2, my);
      ctx.quadraticCurveTo(mx, my + c, mx + w2, my);
      ctx.stroke();
    }
  }
}
const FACES = {
  neutral: { eyeScale: 1, happyEyes: false, mouthCurve: 0.5, mouthOpen: 0, brow: 0 },
  happy: { eyeScale: 1, happyEyes: true, mouthCurve: 1, mouthOpen: 0, brow: 0 },
  excited: { eyeScale: 1.3, happyEyes: false, mouthCurve: 1, mouthOpen: 0.7, brow: 0 },
  sad: { eyeScale: 0.9, happyEyes: false, mouthCurve: -0.8, mouthOpen: 0, brow: 1 },
  surprised: { eyeScale: 1.45, happyEyes: false, mouthCurve: 0, mouthOpen: 0.9, brow: 0 },
  angry: { eyeScale: 0.9, happyEyes: false, mouthCurve: -0.5, mouthOpen: 0, brow: -1 },
  thinking: { eyeScale: 1, happyEyes: false, mouthCurve: 0.15, mouthOpen: 0, brow: 0 }
};
function clamp(v2, lo, hi2) {
  return Math.min(hi2, Math.max(lo, v2));
}
function lighten(hex, amount) {
  const n2 = parseInt(hex.slice(1), 16);
  const r2 = n2 >> 16 & 255;
  const g = n2 >> 8 & 255;
  const b = n2 & 255;
  const mix = (c) => Math.round(c + (255 - c) * amount);
  return `rgb(${mix(r2)}, ${mix(g)}, ${mix(b)})`;
}
async function createAvatarController(host, modelUrl, maps = {}) {
  if (modelUrl) {
    const live2d = new Live2DController(modelUrl, maps);
    try {
      await live2d.mount(host);
      return { controller: live2d, backend: "live2d" };
    } catch (err) {
      live2d.destroy();
      const placeholder2 = new PlaceholderController();
      await placeholder2.mount(host);
      return {
        controller: placeholder2,
        backend: "placeholder",
        reason: err instanceof Error ? err.message : "Live2D unavailable"
      };
    }
  }
  const placeholder = new PlaceholderController();
  await placeholder.mount(host);
  return {
    controller: placeholder,
    backend: "placeholder",
    reason: "No Live2D model configured"
  };
}
const DEFAULTS = {
  energyThreshold: 0.015,
  hangoverMs: 700,
  minSpeechMs: 250,
  prerollMs: 200,
  maxUtteranceMs: 15e3
};
function rms(frame) {
  if (frame.length === 0) return 0;
  let sum = 0;
  for (let i = 0; i < frame.length; i++) sum += frame[i] * frame[i];
  return Math.sqrt(sum / frame.length);
}
function concat(chunks) {
  const total = chunks.reduce((n2, c) => n2 + c.length, 0);
  const out = new Float32Array(total);
  let off = 0;
  for (const c of chunks) {
    out.set(c, off);
    off += c.length;
  }
  return out;
}
class EnergyVad {
  o;
  speaking = false;
  speechChunks = [];
  preroll = [];
  speechMs = 0;
  silenceMs = 0;
  prerollMs = 0;
  constructor(options) {
    this.o = { ...DEFAULTS, ...options };
  }
  reset() {
    this.speaking = false;
    this.speechChunks = [];
    this.preroll = [];
    this.speechMs = 0;
    this.silenceMs = 0;
    this.prerollMs = 0;
  }
  /** Feed one audio frame; returns any speech-start / completed-utterance events. */
  accept(frame) {
    const frameMs = frame.length / this.o.sampleRate * 1e3;
    const loud = rms(frame) >= this.o.energyThreshold;
    const ev = {};
    if (loud) {
      if (!this.speaking) {
        this.speaking = true;
        ev.speechStart = true;
        this.speechChunks = [...this.preroll];
        this.speechMs = this.prerollMs;
        this.preroll = [];
      }
      this.speechChunks.push(frame);
      this.speechMs += frameMs;
      this.silenceMs = 0;
      if (this.speechMs >= this.o.maxUtteranceMs) {
        ev.utterance = this.endUtterance();
      }
      return ev;
    }
    if (this.speaking) {
      this.speechChunks.push(frame);
      this.speechMs += frameMs;
      this.silenceMs += frameMs;
      if (this.silenceMs >= this.o.hangoverMs) {
        const realSpeechMs = this.speechMs - this.silenceMs - this.prerollMs;
        const utt = this.endUtterance();
        if (realSpeechMs >= this.o.minSpeechMs) ev.utterance = utt;
      }
      return ev;
    }
    this.preroll.push(frame);
    this.prerollMs += frameMs;
    while (this.prerollMs > this.o.prerollMs && this.preroll.length > 1) {
      const dropped = this.preroll.shift();
      if (dropped) this.prerollMs -= dropped.length / this.o.sampleRate * 1e3;
    }
    return ev;
  }
  endUtterance() {
    const out = concat(this.speechChunks);
    this.speaking = false;
    this.speechChunks = [];
    this.preroll = [];
    this.speechMs = 0;
    this.silenceMs = 0;
    this.prerollMs = 0;
    return out;
  }
}
class VoiceController {
  constructor() {
    this.synth = window.speechSynthesis;
    this.flapTimer = 0;
    this.raf = 0;
    this.active = false;
    this.audioCtx = null;
    this.source = null;
    this.ttsAvailable = null;
  }
  // cached after first probe
  speak(text, controller, handlers = {}) {
    const clean = cleanForSpeech(text);
    if (!clean) return;
    this.cancel();
    void this.resolveTts().then((useNeural) => {
      if (useNeural) this.speakNeural(clean, controller, handlers);
      else this.speakWebSpeech(clean, controller, handlers);
    });
  }
  cancel() {
    this.active = false;
    this.stopFlap();
    if (this.raf) {
      cancelAnimationFrame(this.raf);
      this.raf = 0;
    }
    try {
      this.source?.stop();
    } catch {
    }
    this.source = null;
    void this.audioCtx?.close().catch(() => {
    });
    this.audioCtx = null;
    try {
      this.synth?.cancel();
    } catch {
    }
  }
  async resolveTts() {
    if (this.ttsAvailable === null) {
      try {
        this.ttsAvailable = (await window.companion.ttsStatus()).available;
      } catch {
        this.ttsAvailable = false;
      }
    }
    return this.ttsAvailable;
  }
  /** Offline neural TTS → Web Audio playback with amplitude-driven lip-sync. */
  async speakNeural(text, controller, handlers) {
    const audio = await window.companion.synthesize(text).catch(() => null);
    if (!audio || audio.samples.length === 0) {
      this.speakWebSpeech(text, controller, handlers);
      return;
    }
    const ctx = new AudioContext();
    this.audioCtx = ctx;
    const buffer = ctx.createBuffer(1, audio.samples.length, audio.sampleRate);
    buffer.getChannelData(0).set(audio.samples);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);
    analyser.connect(ctx.destination);
    this.source = source;
    const frame = new Float32Array(analyser.fftSize);
    this.active = true;
    controller.setSpeaking(true);
    handlers.onStart?.();
    const tick = () => {
      analyser.getFloatTimeDomainData(frame);
      controller.setMouthOpen(Math.min(1, rms(frame) * 9));
      this.raf = requestAnimationFrame(tick);
    };
    tick();
    source.onended = () => {
      if (!this.active) return;
      this.active = false;
      if (this.raf) cancelAnimationFrame(this.raf);
      this.raf = 0;
      controller.setSpeaking(false);
      void ctx.close().catch(() => {
      });
      this.audioCtx = null;
      handlers.onEnd?.();
    };
    source.start();
  }
  /** Web Speech API fallback: flap + boundary pulses (no real audio signal available). */
  speakWebSpeech(text, controller, handlers) {
    if (typeof this.synth === "undefined") return;
    const utter = new SpeechSynthesisUtterance(text);
    utter.rate = 1.05;
    utter.pitch = 1.05;
    utter.onstart = () => {
      this.active = true;
      controller.setSpeaking(true);
      handlers.onStart?.();
      this.startFlap(controller);
    };
    utter.onboundary = () => controller.setMouthOpen(0.85);
    const finish = () => {
      if (!this.active) return;
      this.active = false;
      this.stopFlap();
      controller.setSpeaking(false);
      handlers.onEnd?.();
    };
    utter.onend = finish;
    utter.onerror = finish;
    this.synth.speak(utter);
  }
  startFlap(controller) {
    this.stopFlap();
    this.flapTimer = window.setInterval(() => {
      controller.setMouthOpen(0.2 + Math.random() * 0.6);
    }, 90);
  }
  stopFlap() {
    if (this.flapTimer) {
      window.clearInterval(this.flapTimer);
      this.flapTimer = 0;
    }
  }
}
function AvatarStage({
  modelUrl,
  pose,
  expression,
  voiceEnabled,
  expressionMap,
  motionMap,
  transform,
  onCaption
}) {
  const hostRef = reactExports.useRef(null);
  const controllerRef = reactExports.useRef(null);
  const voiceRef = reactExports.useRef(null);
  const poseRef = reactExports.useRef(pose);
  const captionRef = reactExports.useRef(onCaption);
  const mapsRef = reactExports.useRef({});
  const [backend, setBackend] = reactExports.useState("loading");
  poseRef.current = pose;
  captionRef.current = onCaption;
  mapsRef.current = { expressionMap, motionMap, transform };
  reactExports.useEffect(() => {
    let disposed = false;
    const host = hostRef.current;
    if (!host) return;
    createAvatarController(host, modelUrl, mapsRef.current).then((choice) => {
      if (disposed) {
        choice.controller.destroy();
        return;
      }
      controllerRef.current = choice.controller;
      setBackend(choice.backend);
      console.log(`[avatar] backend=${choice.backend}${choice.reason ? ` (${choice.reason})` : ""}`);
    });
    return () => {
      disposed = true;
      controllerRef.current?.destroy();
      controllerRef.current = null;
    };
  }, [modelUrl]);
  reactExports.useEffect(() => {
    controllerRef.current?.setPose(pose);
  }, [pose, backend]);
  reactExports.useEffect(() => {
    if (expression) controllerRef.current?.setExpression(expression);
  }, [expression, backend]);
  reactExports.useEffect(() => {
    const onMove = (e) => controllerRef.current?.lookAt(e.clientX, e.clientY);
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, []);
  reactExports.useEffect(() => {
    if (!voiceRef.current) voiceRef.current = new VoiceController();
    const voice = voiceRef.current;
    const off = window.companion.onAvatarSpeak((text) => {
      const controller = controllerRef.current;
      if (!voiceEnabled || !controller) return;
      const caption = cleanForSpeech(text);
      voice.speak(text, controller, {
        onStart: () => {
          controller.setPose("speaking");
          captionRef.current?.(caption);
        },
        onEnd: () => {
          controller.setPose(poseRef.current);
          captionRef.current?.(null);
        }
      });
    });
    return () => {
      off();
      voice.cancel();
    };
  }, [voiceEnabled]);
  reactExports.useEffect(() => {
    const onBarge = () => voiceRef.current?.cancel();
    window.addEventListener("companion:bargein", onBarge);
    return () => window.removeEventListener("companion:bargein", onBarge);
  }, []);
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    "div",
    {
      className: "avatar-stage",
      ref: hostRef,
      onClick: () => controllerRef.current?.poke(),
      title: "poke me",
      children: backend === "placeholder" && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "avatar-badge", children: "placeholder avatar" })
    }
  );
}
class MicCapture {
  constructor() {
    this.stream = null;
    this.ctx = null;
    this.node = null;
    this.vad = null;
  }
  get active() {
    return this.stream !== null;
  }
  async start(handlers) {
    if (this.stream) return;
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
      handlers.onError?.(err instanceof Error ? err.message : "microphone unavailable");
      return;
    }
    const ctx = new AudioContext({ sampleRate: 16e3 });
    this.ctx = ctx;
    const sampleRate = ctx.sampleRate;
    this.vad = new EnergyVad({ sampleRate });
    const source = ctx.createMediaStreamSource(this.stream);
    const node = ctx.createScriptProcessor(2048, 1, 1);
    this.node = node;
    node.onaudioprocess = (e) => {
      const frame = new Float32Array(e.inputBuffer.getChannelData(0));
      const ev = this.vad.accept(frame);
      if (ev.speechStart) handlers.onSpeechStart?.();
      if (ev.utterance) handlers.onUtterance(ev.utterance, sampleRate);
    };
    source.connect(node);
    const sink = ctx.createGain();
    sink.gain.value = 0;
    node.connect(sink);
    sink.connect(ctx.destination);
  }
  stop() {
    this.node?.disconnect();
    this.node = null;
    this.stream?.getTracks().forEach((t2) => t2.stop());
    this.stream = null;
    void this.ctx?.close();
    this.ctx = null;
    this.vad?.reset();
    this.vad = null;
  }
}
var xterm = { exports: {} };
(function(module, exports) {
  !function(e, t2) {
    module.exports = t2();
  }(globalThis, () => (() => {
    var e = { 4567: function(e2, t3, i2) {
      var s2 = this && this.__decorate || function(e3, t4, i3, s3) {
        var r3, n3 = arguments.length, o2 = n3 < 3 ? t4 : null === s3 ? s3 = Object.getOwnPropertyDescriptor(t4, i3) : s3;
        if ("object" == typeof Reflect && "function" == typeof Reflect.decorate) o2 = Reflect.decorate(e3, t4, i3, s3);
        else for (var a2 = e3.length - 1; a2 >= 0; a2--) (r3 = e3[a2]) && (o2 = (n3 < 3 ? r3(o2) : n3 > 3 ? r3(t4, i3, o2) : r3(t4, i3)) || o2);
        return n3 > 3 && o2 && Object.defineProperty(t4, i3, o2), o2;
      }, r2 = this && this.__param || function(e3, t4) {
        return function(i3, s3) {
          t4(i3, s3, e3);
        };
      };
      Object.defineProperty(t3, "__esModule", { value: true }), t3.AccessibilityManager = void 0;
      const n2 = i2(9042), o = i2(9924), a = i2(844), h = i2(4725), c = i2(2585), l2 = i2(3656);
      let d = t3.AccessibilityManager = class extends a.Disposable {
        constructor(e3, t4, i3, s3) {
          super(), this._terminal = e3, this._coreBrowserService = i3, this._renderService = s3, this._rowColumns = /* @__PURE__ */ new WeakMap(), this._liveRegionLineCount = 0, this._charsToConsume = [], this._charsToAnnounce = "", this._accessibilityContainer = this._coreBrowserService.mainDocument.createElement("div"), this._accessibilityContainer.classList.add("xterm-accessibility"), this._rowContainer = this._coreBrowserService.mainDocument.createElement("div"), this._rowContainer.setAttribute("role", "list"), this._rowContainer.classList.add("xterm-accessibility-tree"), this._rowElements = [];
          for (let e4 = 0; e4 < this._terminal.rows; e4++) this._rowElements[e4] = this._createAccessibilityTreeNode(), this._rowContainer.appendChild(this._rowElements[e4]);
          if (this._topBoundaryFocusListener = (e4) => this._handleBoundaryFocus(e4, 0), this._bottomBoundaryFocusListener = (e4) => this._handleBoundaryFocus(e4, 1), this._rowElements[0].addEventListener("focus", this._topBoundaryFocusListener), this._rowElements[this._rowElements.length - 1].addEventListener("focus", this._bottomBoundaryFocusListener), this._refreshRowsDimensions(), this._accessibilityContainer.appendChild(this._rowContainer), this._liveRegion = this._coreBrowserService.mainDocument.createElement("div"), this._liveRegion.classList.add("live-region"), this._liveRegion.setAttribute("aria-live", "assertive"), this._accessibilityContainer.appendChild(this._liveRegion), this._liveRegionDebouncer = this.register(new o.TimeBasedDebouncer(this._renderRows.bind(this))), !this._terminal.element) throw new Error("Cannot enable accessibility before Terminal.open");
          this._terminal.element.insertAdjacentElement("afterbegin", this._accessibilityContainer), this.register(this._terminal.onResize((e4) => this._handleResize(e4.rows))), this.register(this._terminal.onRender((e4) => this._refreshRows(e4.start, e4.end))), this.register(this._terminal.onScroll(() => this._refreshRows())), this.register(this._terminal.onA11yChar((e4) => this._handleChar(e4))), this.register(this._terminal.onLineFeed(() => this._handleChar("\n"))), this.register(this._terminal.onA11yTab((e4) => this._handleTab(e4))), this.register(this._terminal.onKey((e4) => this._handleKey(e4.key))), this.register(this._terminal.onBlur(() => this._clearLiveRegion())), this.register(this._renderService.onDimensionsChange(() => this._refreshRowsDimensions())), this.register((0, l2.addDisposableDomListener)(document, "selectionchange", () => this._handleSelectionChange())), this.register(this._coreBrowserService.onDprChange(() => this._refreshRowsDimensions())), this._refreshRows(), this.register((0, a.toDisposable)(() => {
            this._accessibilityContainer.remove(), this._rowElements.length = 0;
          }));
        }
        _handleTab(e3) {
          for (let t4 = 0; t4 < e3; t4++) this._handleChar(" ");
        }
        _handleChar(e3) {
          this._liveRegionLineCount < 21 && (this._charsToConsume.length > 0 ? this._charsToConsume.shift() !== e3 && (this._charsToAnnounce += e3) : this._charsToAnnounce += e3, "\n" === e3 && (this._liveRegionLineCount++, 21 === this._liveRegionLineCount && (this._liveRegion.textContent += n2.tooMuchOutput)));
        }
        _clearLiveRegion() {
          this._liveRegion.textContent = "", this._liveRegionLineCount = 0;
        }
        _handleKey(e3) {
          this._clearLiveRegion(), new RegExp("\\p{Control}", "u").test(e3) || this._charsToConsume.push(e3);
        }
        _refreshRows(e3, t4) {
          this._liveRegionDebouncer.refresh(e3, t4, this._terminal.rows);
        }
        _renderRows(e3, t4) {
          const i3 = this._terminal.buffer, s3 = i3.lines.length.toString();
          for (let r3 = e3; r3 <= t4; r3++) {
            const e4 = i3.lines.get(i3.ydisp + r3), t5 = [], n3 = e4?.translateToString(true, void 0, void 0, t5) || "", o2 = (i3.ydisp + r3 + 1).toString(), a2 = this._rowElements[r3];
            a2 && (0 === n3.length ? (a2.innerText = " ", this._rowColumns.set(a2, [0, 1])) : (a2.textContent = n3, this._rowColumns.set(a2, t5)), a2.setAttribute("aria-posinset", o2), a2.setAttribute("aria-setsize", s3));
          }
          this._announceCharacters();
        }
        _announceCharacters() {
          0 !== this._charsToAnnounce.length && (this._liveRegion.textContent += this._charsToAnnounce, this._charsToAnnounce = "");
        }
        _handleBoundaryFocus(e3, t4) {
          const i3 = e3.target, s3 = this._rowElements[0 === t4 ? 1 : this._rowElements.length - 2];
          if (i3.getAttribute("aria-posinset") === (0 === t4 ? "1" : `${this._terminal.buffer.lines.length}`)) return;
          if (e3.relatedTarget !== s3) return;
          let r3, n3;
          if (0 === t4 ? (r3 = i3, n3 = this._rowElements.pop(), this._rowContainer.removeChild(n3)) : (r3 = this._rowElements.shift(), n3 = i3, this._rowContainer.removeChild(r3)), r3.removeEventListener("focus", this._topBoundaryFocusListener), n3.removeEventListener("focus", this._bottomBoundaryFocusListener), 0 === t4) {
            const e4 = this._createAccessibilityTreeNode();
            this._rowElements.unshift(e4), this._rowContainer.insertAdjacentElement("afterbegin", e4);
          } else {
            const e4 = this._createAccessibilityTreeNode();
            this._rowElements.push(e4), this._rowContainer.appendChild(e4);
          }
          this._rowElements[0].addEventListener("focus", this._topBoundaryFocusListener), this._rowElements[this._rowElements.length - 1].addEventListener("focus", this._bottomBoundaryFocusListener), this._terminal.scrollLines(0 === t4 ? -1 : 1), this._rowElements[0 === t4 ? 1 : this._rowElements.length - 2].focus(), e3.preventDefault(), e3.stopImmediatePropagation();
        }
        _handleSelectionChange() {
          if (0 === this._rowElements.length) return;
          const e3 = document.getSelection();
          if (!e3) return;
          if (e3.isCollapsed) return void (this._rowContainer.contains(e3.anchorNode) && this._terminal.clearSelection());
          if (!e3.anchorNode || !e3.focusNode) return void console.error("anchorNode and/or focusNode are null");
          let t4 = { node: e3.anchorNode, offset: e3.anchorOffset }, i3 = { node: e3.focusNode, offset: e3.focusOffset };
          if ((t4.node.compareDocumentPosition(i3.node) & Node.DOCUMENT_POSITION_PRECEDING || t4.node === i3.node && t4.offset > i3.offset) && ([t4, i3] = [i3, t4]), t4.node.compareDocumentPosition(this._rowElements[0]) & (Node.DOCUMENT_POSITION_CONTAINED_BY | Node.DOCUMENT_POSITION_FOLLOWING) && (t4 = { node: this._rowElements[0].childNodes[0], offset: 0 }), !this._rowContainer.contains(t4.node)) return;
          const s3 = this._rowElements.slice(-1)[0];
          if (i3.node.compareDocumentPosition(s3) & (Node.DOCUMENT_POSITION_CONTAINED_BY | Node.DOCUMENT_POSITION_PRECEDING) && (i3 = { node: s3, offset: s3.textContent?.length ?? 0 }), !this._rowContainer.contains(i3.node)) return;
          const r3 = ({ node: e4, offset: t5 }) => {
            const i4 = e4 instanceof Text ? e4.parentNode : e4;
            let s4 = parseInt(i4?.getAttribute("aria-posinset"), 10) - 1;
            if (isNaN(s4)) return console.warn("row is invalid. Race condition?"), null;
            const r4 = this._rowColumns.get(i4);
            if (!r4) return console.warn("columns is null. Race condition?"), null;
            let n4 = t5 < r4.length ? r4[t5] : r4.slice(-1)[0] + 1;
            return n4 >= this._terminal.cols && (++s4, n4 = 0), { row: s4, column: n4 };
          }, n3 = r3(t4), o2 = r3(i3);
          if (n3 && o2) {
            if (n3.row > o2.row || n3.row === o2.row && n3.column >= o2.column) throw new Error("invalid range");
            this._terminal.select(n3.column, n3.row, (o2.row - n3.row) * this._terminal.cols - n3.column + o2.column);
          }
        }
        _handleResize(e3) {
          this._rowElements[this._rowElements.length - 1].removeEventListener("focus", this._bottomBoundaryFocusListener);
          for (let e4 = this._rowContainer.children.length; e4 < this._terminal.rows; e4++) this._rowElements[e4] = this._createAccessibilityTreeNode(), this._rowContainer.appendChild(this._rowElements[e4]);
          for (; this._rowElements.length > e3; ) this._rowContainer.removeChild(this._rowElements.pop());
          this._rowElements[this._rowElements.length - 1].addEventListener("focus", this._bottomBoundaryFocusListener), this._refreshRowsDimensions();
        }
        _createAccessibilityTreeNode() {
          const e3 = this._coreBrowserService.mainDocument.createElement("div");
          return e3.setAttribute("role", "listitem"), e3.tabIndex = -1, this._refreshRowDimensions(e3), e3;
        }
        _refreshRowsDimensions() {
          if (this._renderService.dimensions.css.cell.height) {
            this._accessibilityContainer.style.width = `${this._renderService.dimensions.css.canvas.width}px`, this._rowElements.length !== this._terminal.rows && this._handleResize(this._terminal.rows);
            for (let e3 = 0; e3 < this._terminal.rows; e3++) this._refreshRowDimensions(this._rowElements[e3]);
          }
        }
        _refreshRowDimensions(e3) {
          e3.style.height = `${this._renderService.dimensions.css.cell.height}px`;
        }
      };
      t3.AccessibilityManager = d = s2([r2(1, c.IInstantiationService), r2(2, h.ICoreBrowserService), r2(3, h.IRenderService)], d);
    }, 3614: (e2, t3) => {
      function i2(e3) {
        return e3.replace(/\r?\n/g, "\r");
      }
      function s2(e3, t4) {
        return t4 ? "\x1B[200~" + e3 + "\x1B[201~" : e3;
      }
      function r2(e3, t4, r3, n3) {
        e3 = s2(e3 = i2(e3), r3.decPrivateModes.bracketedPasteMode && true !== n3.rawOptions.ignoreBracketedPasteMode), r3.triggerDataEvent(e3, true), t4.value = "";
      }
      function n2(e3, t4, i3) {
        const s3 = i3.getBoundingClientRect(), r3 = e3.clientX - s3.left - 10, n3 = e3.clientY - s3.top - 10;
        t4.style.width = "20px", t4.style.height = "20px", t4.style.left = `${r3}px`, t4.style.top = `${n3}px`, t4.style.zIndex = "1000", t4.focus();
      }
      Object.defineProperty(t3, "__esModule", { value: true }), t3.rightClickHandler = t3.moveTextAreaUnderMouseCursor = t3.paste = t3.handlePasteEvent = t3.copyHandler = t3.bracketTextForPaste = t3.prepareTextForTerminal = void 0, t3.prepareTextForTerminal = i2, t3.bracketTextForPaste = s2, t3.copyHandler = function(e3, t4) {
        e3.clipboardData && e3.clipboardData.setData("text/plain", t4.selectionText), e3.preventDefault();
      }, t3.handlePasteEvent = function(e3, t4, i3, s3) {
        e3.stopPropagation(), e3.clipboardData && r2(e3.clipboardData.getData("text/plain"), t4, i3, s3);
      }, t3.paste = r2, t3.moveTextAreaUnderMouseCursor = n2, t3.rightClickHandler = function(e3, t4, i3, s3, r3) {
        n2(e3, t4, i3), r3 && s3.rightClickSelect(e3), t4.value = s3.selectionText, t4.select();
      };
    }, 7239: (e2, t3, i2) => {
      Object.defineProperty(t3, "__esModule", { value: true }), t3.ColorContrastCache = void 0;
      const s2 = i2(1505);
      t3.ColorContrastCache = class {
        constructor() {
          this._color = new s2.TwoKeyMap(), this._css = new s2.TwoKeyMap();
        }
        setCss(e3, t4, i3) {
          this._css.set(e3, t4, i3);
        }
        getCss(e3, t4) {
          return this._css.get(e3, t4);
        }
        setColor(e3, t4, i3) {
          this._color.set(e3, t4, i3);
        }
        getColor(e3, t4) {
          return this._color.get(e3, t4);
        }
        clear() {
          this._color.clear(), this._css.clear();
        }
      };
    }, 3656: (e2, t3) => {
      Object.defineProperty(t3, "__esModule", { value: true }), t3.addDisposableDomListener = void 0, t3.addDisposableDomListener = function(e3, t4, i2, s2) {
        e3.addEventListener(t4, i2, s2);
        let r2 = false;
        return { dispose: () => {
          r2 || (r2 = true, e3.removeEventListener(t4, i2, s2));
        } };
      };
    }, 3551: function(e2, t3, i2) {
      var s2 = this && this.__decorate || function(e3, t4, i3, s3) {
        var r3, n3 = arguments.length, o2 = n3 < 3 ? t4 : null === s3 ? s3 = Object.getOwnPropertyDescriptor(t4, i3) : s3;
        if ("object" == typeof Reflect && "function" == typeof Reflect.decorate) o2 = Reflect.decorate(e3, t4, i3, s3);
        else for (var a2 = e3.length - 1; a2 >= 0; a2--) (r3 = e3[a2]) && (o2 = (n3 < 3 ? r3(o2) : n3 > 3 ? r3(t4, i3, o2) : r3(t4, i3)) || o2);
        return n3 > 3 && o2 && Object.defineProperty(t4, i3, o2), o2;
      }, r2 = this && this.__param || function(e3, t4) {
        return function(i3, s3) {
          t4(i3, s3, e3);
        };
      };
      Object.defineProperty(t3, "__esModule", { value: true }), t3.Linkifier = void 0;
      const n2 = i2(3656), o = i2(8460), a = i2(844), h = i2(2585), c = i2(4725);
      let l2 = t3.Linkifier = class extends a.Disposable {
        get currentLink() {
          return this._currentLink;
        }
        constructor(e3, t4, i3, s3, r3) {
          super(), this._element = e3, this._mouseService = t4, this._renderService = i3, this._bufferService = s3, this._linkProviderService = r3, this._linkCacheDisposables = [], this._isMouseOut = true, this._wasResized = false, this._activeLine = -1, this._onShowLinkUnderline = this.register(new o.EventEmitter()), this.onShowLinkUnderline = this._onShowLinkUnderline.event, this._onHideLinkUnderline = this.register(new o.EventEmitter()), this.onHideLinkUnderline = this._onHideLinkUnderline.event, this.register((0, a.getDisposeArrayDisposable)(this._linkCacheDisposables)), this.register((0, a.toDisposable)(() => {
            this._lastMouseEvent = void 0, this._activeProviderReplies?.clear();
          })), this.register(this._bufferService.onResize(() => {
            this._clearCurrentLink(), this._wasResized = true;
          })), this.register((0, n2.addDisposableDomListener)(this._element, "mouseleave", () => {
            this._isMouseOut = true, this._clearCurrentLink();
          })), this.register((0, n2.addDisposableDomListener)(this._element, "mousemove", this._handleMouseMove.bind(this))), this.register((0, n2.addDisposableDomListener)(this._element, "mousedown", this._handleMouseDown.bind(this))), this.register((0, n2.addDisposableDomListener)(this._element, "mouseup", this._handleMouseUp.bind(this)));
        }
        _handleMouseMove(e3) {
          this._lastMouseEvent = e3;
          const t4 = this._positionFromMouseEvent(e3, this._element, this._mouseService);
          if (!t4) return;
          this._isMouseOut = false;
          const i3 = e3.composedPath();
          for (let e4 = 0; e4 < i3.length; e4++) {
            const t5 = i3[e4];
            if (t5.classList.contains("xterm")) break;
            if (t5.classList.contains("xterm-hover")) return;
          }
          this._lastBufferCell && t4.x === this._lastBufferCell.x && t4.y === this._lastBufferCell.y || (this._handleHover(t4), this._lastBufferCell = t4);
        }
        _handleHover(e3) {
          if (this._activeLine !== e3.y || this._wasResized) return this._clearCurrentLink(), this._askForLink(e3, false), void (this._wasResized = false);
          this._currentLink && this._linkAtPosition(this._currentLink.link, e3) || (this._clearCurrentLink(), this._askForLink(e3, true));
        }
        _askForLink(e3, t4) {
          this._activeProviderReplies && t4 || (this._activeProviderReplies?.forEach((e4) => {
            e4?.forEach((e5) => {
              e5.link.dispose && e5.link.dispose();
            });
          }), this._activeProviderReplies = /* @__PURE__ */ new Map(), this._activeLine = e3.y);
          let i3 = false;
          for (const [s3, r3] of this._linkProviderService.linkProviders.entries()) if (t4) {
            const t5 = this._activeProviderReplies?.get(s3);
            t5 && (i3 = this._checkLinkProviderResult(s3, e3, i3));
          } else r3.provideLinks(e3.y, (t5) => {
            if (this._isMouseOut) return;
            const r4 = t5?.map((e4) => ({ link: e4 }));
            this._activeProviderReplies?.set(s3, r4), i3 = this._checkLinkProviderResult(s3, e3, i3), this._activeProviderReplies?.size === this._linkProviderService.linkProviders.length && this._removeIntersectingLinks(e3.y, this._activeProviderReplies);
          });
        }
        _removeIntersectingLinks(e3, t4) {
          const i3 = /* @__PURE__ */ new Set();
          for (let s3 = 0; s3 < t4.size; s3++) {
            const r3 = t4.get(s3);
            if (r3) for (let t5 = 0; t5 < r3.length; t5++) {
              const s4 = r3[t5], n3 = s4.link.range.start.y < e3 ? 0 : s4.link.range.start.x, o2 = s4.link.range.end.y > e3 ? this._bufferService.cols : s4.link.range.end.x;
              for (let e4 = n3; e4 <= o2; e4++) {
                if (i3.has(e4)) {
                  r3.splice(t5--, 1);
                  break;
                }
                i3.add(e4);
              }
            }
          }
        }
        _checkLinkProviderResult(e3, t4, i3) {
          if (!this._activeProviderReplies) return i3;
          const s3 = this._activeProviderReplies.get(e3);
          let r3 = false;
          for (let t5 = 0; t5 < e3; t5++) this._activeProviderReplies.has(t5) && !this._activeProviderReplies.get(t5) || (r3 = true);
          if (!r3 && s3) {
            const e4 = s3.find((e5) => this._linkAtPosition(e5.link, t4));
            e4 && (i3 = true, this._handleNewLink(e4));
          }
          if (this._activeProviderReplies.size === this._linkProviderService.linkProviders.length && !i3) for (let e4 = 0; e4 < this._activeProviderReplies.size; e4++) {
            const s4 = this._activeProviderReplies.get(e4)?.find((e5) => this._linkAtPosition(e5.link, t4));
            if (s4) {
              i3 = true, this._handleNewLink(s4);
              break;
            }
          }
          return i3;
        }
        _handleMouseDown() {
          this._mouseDownLink = this._currentLink;
        }
        _handleMouseUp(e3) {
          if (!this._currentLink) return;
          const t4 = this._positionFromMouseEvent(e3, this._element, this._mouseService);
          t4 && this._mouseDownLink === this._currentLink && this._linkAtPosition(this._currentLink.link, t4) && this._currentLink.link.activate(e3, this._currentLink.link.text);
        }
        _clearCurrentLink(e3, t4) {
          this._currentLink && this._lastMouseEvent && (!e3 || !t4 || this._currentLink.link.range.start.y >= e3 && this._currentLink.link.range.end.y <= t4) && (this._linkLeave(this._element, this._currentLink.link, this._lastMouseEvent), this._currentLink = void 0, (0, a.disposeArray)(this._linkCacheDisposables));
        }
        _handleNewLink(e3) {
          if (!this._lastMouseEvent) return;
          const t4 = this._positionFromMouseEvent(this._lastMouseEvent, this._element, this._mouseService);
          t4 && this._linkAtPosition(e3.link, t4) && (this._currentLink = e3, this._currentLink.state = { decorations: { underline: void 0 === e3.link.decorations || e3.link.decorations.underline, pointerCursor: void 0 === e3.link.decorations || e3.link.decorations.pointerCursor }, isHovered: true }, this._linkHover(this._element, e3.link, this._lastMouseEvent), e3.link.decorations = {}, Object.defineProperties(e3.link.decorations, { pointerCursor: { get: () => this._currentLink?.state?.decorations.pointerCursor, set: (e4) => {
            this._currentLink?.state && this._currentLink.state.decorations.pointerCursor !== e4 && (this._currentLink.state.decorations.pointerCursor = e4, this._currentLink.state.isHovered && this._element.classList.toggle("xterm-cursor-pointer", e4));
          } }, underline: { get: () => this._currentLink?.state?.decorations.underline, set: (t5) => {
            this._currentLink?.state && this._currentLink?.state?.decorations.underline !== t5 && (this._currentLink.state.decorations.underline = t5, this._currentLink.state.isHovered && this._fireUnderlineEvent(e3.link, t5));
          } } }), this._linkCacheDisposables.push(this._renderService.onRenderedViewportChange((e4) => {
            if (!this._currentLink) return;
            const t5 = 0 === e4.start ? 0 : e4.start + 1 + this._bufferService.buffer.ydisp, i3 = this._bufferService.buffer.ydisp + 1 + e4.end;
            if (this._currentLink.link.range.start.y >= t5 && this._currentLink.link.range.end.y <= i3 && (this._clearCurrentLink(t5, i3), this._lastMouseEvent)) {
              const e5 = this._positionFromMouseEvent(this._lastMouseEvent, this._element, this._mouseService);
              e5 && this._askForLink(e5, false);
            }
          })));
        }
        _linkHover(e3, t4, i3) {
          this._currentLink?.state && (this._currentLink.state.isHovered = true, this._currentLink.state.decorations.underline && this._fireUnderlineEvent(t4, true), this._currentLink.state.decorations.pointerCursor && e3.classList.add("xterm-cursor-pointer")), t4.hover && t4.hover(i3, t4.text);
        }
        _fireUnderlineEvent(e3, t4) {
          const i3 = e3.range, s3 = this._bufferService.buffer.ydisp, r3 = this._createLinkUnderlineEvent(i3.start.x - 1, i3.start.y - s3 - 1, i3.end.x, i3.end.y - s3 - 1, void 0);
          (t4 ? this._onShowLinkUnderline : this._onHideLinkUnderline).fire(r3);
        }
        _linkLeave(e3, t4, i3) {
          this._currentLink?.state && (this._currentLink.state.isHovered = false, this._currentLink.state.decorations.underline && this._fireUnderlineEvent(t4, false), this._currentLink.state.decorations.pointerCursor && e3.classList.remove("xterm-cursor-pointer")), t4.leave && t4.leave(i3, t4.text);
        }
        _linkAtPosition(e3, t4) {
          const i3 = e3.range.start.y * this._bufferService.cols + e3.range.start.x, s3 = e3.range.end.y * this._bufferService.cols + e3.range.end.x, r3 = t4.y * this._bufferService.cols + t4.x;
          return i3 <= r3 && r3 <= s3;
        }
        _positionFromMouseEvent(e3, t4, i3) {
          const s3 = i3.getCoords(e3, t4, this._bufferService.cols, this._bufferService.rows);
          if (s3) return { x: s3[0], y: s3[1] + this._bufferService.buffer.ydisp };
        }
        _createLinkUnderlineEvent(e3, t4, i3, s3, r3) {
          return { x1: e3, y1: t4, x2: i3, y2: s3, cols: this._bufferService.cols, fg: r3 };
        }
      };
      t3.Linkifier = l2 = s2([r2(1, c.IMouseService), r2(2, c.IRenderService), r2(3, h.IBufferService), r2(4, c.ILinkProviderService)], l2);
    }, 9042: (e2, t3) => {
      Object.defineProperty(t3, "__esModule", { value: true }), t3.tooMuchOutput = t3.promptLabel = void 0, t3.promptLabel = "Terminal input", t3.tooMuchOutput = "Too much output to announce, navigate to rows manually to read";
    }, 3730: function(e2, t3, i2) {
      var s2 = this && this.__decorate || function(e3, t4, i3, s3) {
        var r3, n3 = arguments.length, o2 = n3 < 3 ? t4 : null === s3 ? s3 = Object.getOwnPropertyDescriptor(t4, i3) : s3;
        if ("object" == typeof Reflect && "function" == typeof Reflect.decorate) o2 = Reflect.decorate(e3, t4, i3, s3);
        else for (var a2 = e3.length - 1; a2 >= 0; a2--) (r3 = e3[a2]) && (o2 = (n3 < 3 ? r3(o2) : n3 > 3 ? r3(t4, i3, o2) : r3(t4, i3)) || o2);
        return n3 > 3 && o2 && Object.defineProperty(t4, i3, o2), o2;
      }, r2 = this && this.__param || function(e3, t4) {
        return function(i3, s3) {
          t4(i3, s3, e3);
        };
      };
      Object.defineProperty(t3, "__esModule", { value: true }), t3.OscLinkProvider = void 0;
      const n2 = i2(511), o = i2(2585);
      let a = t3.OscLinkProvider = class {
        constructor(e3, t4, i3) {
          this._bufferService = e3, this._optionsService = t4, this._oscLinkService = i3;
        }
        provideLinks(e3, t4) {
          const i3 = this._bufferService.buffer.lines.get(e3 - 1);
          if (!i3) return void t4(void 0);
          const s3 = [], r3 = this._optionsService.rawOptions.linkHandler, o2 = new n2.CellData(), a2 = i3.getTrimmedLength();
          let c = -1, l2 = -1, d = false;
          for (let t5 = 0; t5 < a2; t5++) if (-1 !== l2 || i3.hasContent(t5)) {
            if (i3.loadCell(t5, o2), o2.hasExtendedAttrs() && o2.extended.urlId) {
              if (-1 === l2) {
                l2 = t5, c = o2.extended.urlId;
                continue;
              }
              d = o2.extended.urlId !== c;
            } else -1 !== l2 && (d = true);
            if (d || -1 !== l2 && t5 === a2 - 1) {
              const i4 = this._oscLinkService.getLinkData(c)?.uri;
              if (i4) {
                const n3 = { start: { x: l2 + 1, y: e3 }, end: { x: t5 + (d || t5 !== a2 - 1 ? 0 : 1), y: e3 } };
                let o3 = false;
                if (!r3?.allowNonHttpProtocols) try {
                  const e4 = new URL(i4);
                  ["http:", "https:"].includes(e4.protocol) || (o3 = true);
                } catch (e4) {
                  o3 = true;
                }
                o3 || s3.push({ text: i4, range: n3, activate: (e4, t6) => r3 ? r3.activate(e4, t6, n3) : h(0, t6), hover: (e4, t6) => r3?.hover?.(e4, t6, n3), leave: (e4, t6) => r3?.leave?.(e4, t6, n3) });
              }
              d = false, o2.hasExtendedAttrs() && o2.extended.urlId ? (l2 = t5, c = o2.extended.urlId) : (l2 = -1, c = -1);
            }
          }
          t4(s3);
        }
      };
      function h(e3, t4) {
        if (confirm(`Do you want to navigate to ${t4}?

WARNING: This link could potentially be dangerous`)) {
          const e4 = window.open();
          if (e4) {
            try {
              e4.opener = null;
            } catch {
            }
            e4.location.href = t4;
          } else console.warn("Opening link blocked as opener could not be cleared");
        }
      }
      t3.OscLinkProvider = a = s2([r2(0, o.IBufferService), r2(1, o.IOptionsService), r2(2, o.IOscLinkService)], a);
    }, 6193: (e2, t3) => {
      Object.defineProperty(t3, "__esModule", { value: true }), t3.RenderDebouncer = void 0, t3.RenderDebouncer = class {
        constructor(e3, t4) {
          this._renderCallback = e3, this._coreBrowserService = t4, this._refreshCallbacks = [];
        }
        dispose() {
          this._animationFrame && (this._coreBrowserService.window.cancelAnimationFrame(this._animationFrame), this._animationFrame = void 0);
        }
        addRefreshCallback(e3) {
          return this._refreshCallbacks.push(e3), this._animationFrame || (this._animationFrame = this._coreBrowserService.window.requestAnimationFrame(() => this._innerRefresh())), this._animationFrame;
        }
        refresh(e3, t4, i2) {
          this._rowCount = i2, e3 = void 0 !== e3 ? e3 : 0, t4 = void 0 !== t4 ? t4 : this._rowCount - 1, this._rowStart = void 0 !== this._rowStart ? Math.min(this._rowStart, e3) : e3, this._rowEnd = void 0 !== this._rowEnd ? Math.max(this._rowEnd, t4) : t4, this._animationFrame || (this._animationFrame = this._coreBrowserService.window.requestAnimationFrame(() => this._innerRefresh()));
        }
        _innerRefresh() {
          if (this._animationFrame = void 0, void 0 === this._rowStart || void 0 === this._rowEnd || void 0 === this._rowCount) return void this._runRefreshCallbacks();
          const e3 = Math.max(this._rowStart, 0), t4 = Math.min(this._rowEnd, this._rowCount - 1);
          this._rowStart = void 0, this._rowEnd = void 0, this._renderCallback(e3, t4), this._runRefreshCallbacks();
        }
        _runRefreshCallbacks() {
          for (const e3 of this._refreshCallbacks) e3(0);
          this._refreshCallbacks = [];
        }
      };
    }, 3236: (e2, t3, i2) => {
      Object.defineProperty(t3, "__esModule", { value: true }), t3.Terminal = void 0;
      const s2 = i2(3614), r2 = i2(3656), n2 = i2(3551), o = i2(9042), a = i2(3730), h = i2(1680), c = i2(3107), l2 = i2(5744), d = i2(2950), _ = i2(1296), u2 = i2(428), f2 = i2(4269), v2 = i2(5114), p2 = i2(8934), g = i2(3230), m2 = i2(9312), S2 = i2(4725), C2 = i2(6731), b = i2(8055), w2 = i2(8969), y2 = i2(8460), E2 = i2(844), k2 = i2(6114), L2 = i2(8437), D2 = i2(2584), R2 = i2(7399), x2 = i2(5941), A2 = i2(9074), B2 = i2(2585), T2 = i2(5435), M2 = i2(4567), O2 = i2(779);
      class P2 extends w2.CoreTerminal {
        get onFocus() {
          return this._onFocus.event;
        }
        get onBlur() {
          return this._onBlur.event;
        }
        get onA11yChar() {
          return this._onA11yCharEmitter.event;
        }
        get onA11yTab() {
          return this._onA11yTabEmitter.event;
        }
        get onWillOpen() {
          return this._onWillOpen.event;
        }
        constructor(e3 = {}) {
          super(e3), this.browser = k2, this._keyDownHandled = false, this._keyDownSeen = false, this._keyPressHandled = false, this._unprocessedDeadKey = false, this._accessibilityManager = this.register(new E2.MutableDisposable()), this._onCursorMove = this.register(new y2.EventEmitter()), this.onCursorMove = this._onCursorMove.event, this._onKey = this.register(new y2.EventEmitter()), this.onKey = this._onKey.event, this._onRender = this.register(new y2.EventEmitter()), this.onRender = this._onRender.event, this._onSelectionChange = this.register(new y2.EventEmitter()), this.onSelectionChange = this._onSelectionChange.event, this._onTitleChange = this.register(new y2.EventEmitter()), this.onTitleChange = this._onTitleChange.event, this._onBell = this.register(new y2.EventEmitter()), this.onBell = this._onBell.event, this._onFocus = this.register(new y2.EventEmitter()), this._onBlur = this.register(new y2.EventEmitter()), this._onA11yCharEmitter = this.register(new y2.EventEmitter()), this._onA11yTabEmitter = this.register(new y2.EventEmitter()), this._onWillOpen = this.register(new y2.EventEmitter()), this._setup(), this._decorationService = this._instantiationService.createInstance(A2.DecorationService), this._instantiationService.setService(B2.IDecorationService, this._decorationService), this._linkProviderService = this._instantiationService.createInstance(O2.LinkProviderService), this._instantiationService.setService(S2.ILinkProviderService, this._linkProviderService), this._linkProviderService.registerLinkProvider(this._instantiationService.createInstance(a.OscLinkProvider)), this.register(this._inputHandler.onRequestBell(() => this._onBell.fire())), this.register(this._inputHandler.onRequestRefreshRows((e4, t4) => this.refresh(e4, t4))), this.register(this._inputHandler.onRequestSendFocus(() => this._reportFocus())), this.register(this._inputHandler.onRequestReset(() => this.reset())), this.register(this._inputHandler.onRequestWindowsOptionsReport((e4) => this._reportWindowsOptions(e4))), this.register(this._inputHandler.onColor((e4) => this._handleColorEvent(e4))), this.register((0, y2.forwardEvent)(this._inputHandler.onCursorMove, this._onCursorMove)), this.register((0, y2.forwardEvent)(this._inputHandler.onTitleChange, this._onTitleChange)), this.register((0, y2.forwardEvent)(this._inputHandler.onA11yChar, this._onA11yCharEmitter)), this.register((0, y2.forwardEvent)(this._inputHandler.onA11yTab, this._onA11yTabEmitter)), this.register(this._bufferService.onResize((e4) => this._afterResize(e4.cols, e4.rows))), this.register((0, E2.toDisposable)(() => {
            this._customKeyEventHandler = void 0, this.element?.parentNode?.removeChild(this.element);
          }));
        }
        _handleColorEvent(e3) {
          if (this._themeService) for (const t4 of e3) {
            let e4, i3 = "";
            switch (t4.index) {
              case 256:
                e4 = "foreground", i3 = "10";
                break;
              case 257:
                e4 = "background", i3 = "11";
                break;
              case 258:
                e4 = "cursor", i3 = "12";
                break;
              default:
                e4 = "ansi", i3 = "4;" + t4.index;
            }
            switch (t4.type) {
              case 0:
                const s3 = b.color.toColorRGB("ansi" === e4 ? this._themeService.colors.ansi[t4.index] : this._themeService.colors[e4]);
                this.coreService.triggerDataEvent(`${D2.C0.ESC}]${i3};${(0, x2.toRgbString)(s3)}${D2.C1_ESCAPED.ST}`);
                break;
              case 1:
                if ("ansi" === e4) this._themeService.modifyColors((e5) => e5.ansi[t4.index] = b.channels.toColor(...t4.color));
                else {
                  const i4 = e4;
                  this._themeService.modifyColors((e5) => e5[i4] = b.channels.toColor(...t4.color));
                }
                break;
              case 2:
                this._themeService.restoreColor(t4.index);
            }
          }
        }
        _setup() {
          super._setup(), this._customKeyEventHandler = void 0;
        }
        get buffer() {
          return this.buffers.active;
        }
        focus() {
          this.textarea && this.textarea.focus({ preventScroll: true });
        }
        _handleScreenReaderModeOptionChange(e3) {
          e3 ? !this._accessibilityManager.value && this._renderService && (this._accessibilityManager.value = this._instantiationService.createInstance(M2.AccessibilityManager, this)) : this._accessibilityManager.clear();
        }
        _handleTextAreaFocus(e3) {
          this.coreService.decPrivateModes.sendFocus && this.coreService.triggerDataEvent(D2.C0.ESC + "[I"), this.element.classList.add("focus"), this._showCursor(), this._onFocus.fire();
        }
        blur() {
          return this.textarea?.blur();
        }
        _handleTextAreaBlur() {
          this.textarea.value = "", this.refresh(this.buffer.y, this.buffer.y), this.coreService.decPrivateModes.sendFocus && this.coreService.triggerDataEvent(D2.C0.ESC + "[O"), this.element.classList.remove("focus"), this._onBlur.fire();
        }
        _syncTextArea() {
          if (!this.textarea || !this.buffer.isCursorInViewport || this._compositionHelper.isComposing || !this._renderService) return;
          const e3 = this.buffer.ybase + this.buffer.y, t4 = this.buffer.lines.get(e3);
          if (!t4) return;
          const i3 = Math.min(this.buffer.x, this.cols - 1), s3 = this._renderService.dimensions.css.cell.height, r3 = t4.getWidth(i3), n3 = this._renderService.dimensions.css.cell.width * r3, o2 = this.buffer.y * this._renderService.dimensions.css.cell.height, a2 = i3 * this._renderService.dimensions.css.cell.width;
          this.textarea.style.left = a2 + "px", this.textarea.style.top = o2 + "px", this.textarea.style.width = n3 + "px", this.textarea.style.height = s3 + "px", this.textarea.style.lineHeight = s3 + "px", this.textarea.style.zIndex = "-5";
        }
        _initGlobal() {
          this._bindKeys(), this.register((0, r2.addDisposableDomListener)(this.element, "copy", (e4) => {
            this.hasSelection() && (0, s2.copyHandler)(e4, this._selectionService);
          }));
          const e3 = (e4) => (0, s2.handlePasteEvent)(e4, this.textarea, this.coreService, this.optionsService);
          this.register((0, r2.addDisposableDomListener)(this.textarea, "paste", e3)), this.register((0, r2.addDisposableDomListener)(this.element, "paste", e3)), k2.isFirefox ? this.register((0, r2.addDisposableDomListener)(this.element, "mousedown", (e4) => {
            2 === e4.button && (0, s2.rightClickHandler)(e4, this.textarea, this.screenElement, this._selectionService, this.options.rightClickSelectsWord);
          })) : this.register((0, r2.addDisposableDomListener)(this.element, "contextmenu", (e4) => {
            (0, s2.rightClickHandler)(e4, this.textarea, this.screenElement, this._selectionService, this.options.rightClickSelectsWord);
          })), k2.isLinux && this.register((0, r2.addDisposableDomListener)(this.element, "auxclick", (e4) => {
            1 === e4.button && (0, s2.moveTextAreaUnderMouseCursor)(e4, this.textarea, this.screenElement);
          }));
        }
        _bindKeys() {
          this.register((0, r2.addDisposableDomListener)(this.textarea, "keyup", (e3) => this._keyUp(e3), true)), this.register((0, r2.addDisposableDomListener)(this.textarea, "keydown", (e3) => this._keyDown(e3), true)), this.register((0, r2.addDisposableDomListener)(this.textarea, "keypress", (e3) => this._keyPress(e3), true)), this.register((0, r2.addDisposableDomListener)(this.textarea, "compositionstart", () => this._compositionHelper.compositionstart())), this.register((0, r2.addDisposableDomListener)(this.textarea, "compositionupdate", (e3) => this._compositionHelper.compositionupdate(e3))), this.register((0, r2.addDisposableDomListener)(this.textarea, "compositionend", () => this._compositionHelper.compositionend())), this.register((0, r2.addDisposableDomListener)(this.textarea, "input", (e3) => this._inputEvent(e3), true)), this.register(this.onRender(() => this._compositionHelper.updateCompositionElements()));
        }
        open(e3) {
          if (!e3) throw new Error("Terminal requires a parent element.");
          if (e3.isConnected || this._logService.debug("Terminal.open was called on an element that was not attached to the DOM"), this.element?.ownerDocument.defaultView && this._coreBrowserService) return void (this.element.ownerDocument.defaultView !== this._coreBrowserService.window && (this._coreBrowserService.window = this.element.ownerDocument.defaultView));
          this._document = e3.ownerDocument, this.options.documentOverride && this.options.documentOverride instanceof Document && (this._document = this.optionsService.rawOptions.documentOverride), this.element = this._document.createElement("div"), this.element.dir = "ltr", this.element.classList.add("terminal"), this.element.classList.add("xterm"), e3.appendChild(this.element);
          const t4 = this._document.createDocumentFragment();
          this._viewportElement = this._document.createElement("div"), this._viewportElement.classList.add("xterm-viewport"), t4.appendChild(this._viewportElement), this._viewportScrollArea = this._document.createElement("div"), this._viewportScrollArea.classList.add("xterm-scroll-area"), this._viewportElement.appendChild(this._viewportScrollArea), this.screenElement = this._document.createElement("div"), this.screenElement.classList.add("xterm-screen"), this.register((0, r2.addDisposableDomListener)(this.screenElement, "mousemove", (e4) => this.updateCursorStyle(e4))), this._helperContainer = this._document.createElement("div"), this._helperContainer.classList.add("xterm-helpers"), this.screenElement.appendChild(this._helperContainer), t4.appendChild(this.screenElement), this.textarea = this._document.createElement("textarea"), this.textarea.classList.add("xterm-helper-textarea"), this.textarea.setAttribute("aria-label", o.promptLabel), k2.isChromeOS || this.textarea.setAttribute("aria-multiline", "false"), this.textarea.setAttribute("autocorrect", "off"), this.textarea.setAttribute("autocapitalize", "off"), this.textarea.setAttribute("spellcheck", "false"), this.textarea.tabIndex = 0, this._coreBrowserService = this.register(this._instantiationService.createInstance(v2.CoreBrowserService, this.textarea, e3.ownerDocument.defaultView ?? window, this._document ?? "undefined" != typeof window ? window.document : null)), this._instantiationService.setService(S2.ICoreBrowserService, this._coreBrowserService), this.register((0, r2.addDisposableDomListener)(this.textarea, "focus", (e4) => this._handleTextAreaFocus(e4))), this.register((0, r2.addDisposableDomListener)(this.textarea, "blur", () => this._handleTextAreaBlur())), this._helperContainer.appendChild(this.textarea), this._charSizeService = this._instantiationService.createInstance(u2.CharSizeService, this._document, this._helperContainer), this._instantiationService.setService(S2.ICharSizeService, this._charSizeService), this._themeService = this._instantiationService.createInstance(C2.ThemeService), this._instantiationService.setService(S2.IThemeService, this._themeService), this._characterJoinerService = this._instantiationService.createInstance(f2.CharacterJoinerService), this._instantiationService.setService(S2.ICharacterJoinerService, this._characterJoinerService), this._renderService = this.register(this._instantiationService.createInstance(g.RenderService, this.rows, this.screenElement)), this._instantiationService.setService(S2.IRenderService, this._renderService), this.register(this._renderService.onRenderedViewportChange((e4) => this._onRender.fire(e4))), this.onResize((e4) => this._renderService.resize(e4.cols, e4.rows)), this._compositionView = this._document.createElement("div"), this._compositionView.classList.add("composition-view"), this._compositionHelper = this._instantiationService.createInstance(d.CompositionHelper, this.textarea, this._compositionView), this._helperContainer.appendChild(this._compositionView), this._mouseService = this._instantiationService.createInstance(p2.MouseService), this._instantiationService.setService(S2.IMouseService, this._mouseService), this.linkifier = this.register(this._instantiationService.createInstance(n2.Linkifier, this.screenElement)), this.element.appendChild(t4);
          try {
            this._onWillOpen.fire(this.element);
          } catch {
          }
          this._renderService.hasRenderer() || this._renderService.setRenderer(this._createRenderer()), this.viewport = this._instantiationService.createInstance(h.Viewport, this._viewportElement, this._viewportScrollArea), this.viewport.onRequestScrollLines((e4) => this.scrollLines(e4.amount, e4.suppressScrollEvent, 1)), this.register(this._inputHandler.onRequestSyncScrollBar(() => this.viewport.syncScrollArea())), this.register(this.viewport), this.register(this.onCursorMove(() => {
            this._renderService.handleCursorMove(), this._syncTextArea();
          })), this.register(this.onResize(() => this._renderService.handleResize(this.cols, this.rows))), this.register(this.onBlur(() => this._renderService.handleBlur())), this.register(this.onFocus(() => this._renderService.handleFocus())), this.register(this._renderService.onDimensionsChange(() => this.viewport.syncScrollArea())), this._selectionService = this.register(this._instantiationService.createInstance(m2.SelectionService, this.element, this.screenElement, this.linkifier)), this._instantiationService.setService(S2.ISelectionService, this._selectionService), this.register(this._selectionService.onRequestScrollLines((e4) => this.scrollLines(e4.amount, e4.suppressScrollEvent))), this.register(this._selectionService.onSelectionChange(() => this._onSelectionChange.fire())), this.register(this._selectionService.onRequestRedraw((e4) => this._renderService.handleSelectionChanged(e4.start, e4.end, e4.columnSelectMode))), this.register(this._selectionService.onLinuxMouseSelection((e4) => {
            this.textarea.value = e4, this.textarea.focus(), this.textarea.select();
          })), this.register(this._onScroll.event((e4) => {
            this.viewport.syncScrollArea(), this._selectionService.refresh();
          })), this.register((0, r2.addDisposableDomListener)(this._viewportElement, "scroll", () => this._selectionService.refresh())), this.register(this._instantiationService.createInstance(c.BufferDecorationRenderer, this.screenElement)), this.register((0, r2.addDisposableDomListener)(this.element, "mousedown", (e4) => this._selectionService.handleMouseDown(e4))), this.coreMouseService.areMouseEventsActive ? (this._selectionService.disable(), this.element.classList.add("enable-mouse-events")) : this._selectionService.enable(), this.options.screenReaderMode && (this._accessibilityManager.value = this._instantiationService.createInstance(M2.AccessibilityManager, this)), this.register(this.optionsService.onSpecificOptionChange("screenReaderMode", (e4) => this._handleScreenReaderModeOptionChange(e4))), this.options.overviewRulerWidth && (this._overviewRulerRenderer = this.register(this._instantiationService.createInstance(l2.OverviewRulerRenderer, this._viewportElement, this.screenElement))), this.optionsService.onSpecificOptionChange("overviewRulerWidth", (e4) => {
            !this._overviewRulerRenderer && e4 && this._viewportElement && this.screenElement && (this._overviewRulerRenderer = this.register(this._instantiationService.createInstance(l2.OverviewRulerRenderer, this._viewportElement, this.screenElement)));
          }), this._charSizeService.measure(), this.refresh(0, this.rows - 1), this._initGlobal(), this.bindMouse();
        }
        _createRenderer() {
          return this._instantiationService.createInstance(_.DomRenderer, this, this._document, this.element, this.screenElement, this._viewportElement, this._helperContainer, this.linkifier);
        }
        bindMouse() {
          const e3 = this, t4 = this.element;
          function i3(t5) {
            const i4 = e3._mouseService.getMouseReportCoords(t5, e3.screenElement);
            if (!i4) return false;
            let s4, r3;
            switch (t5.overrideType || t5.type) {
              case "mousemove":
                r3 = 32, void 0 === t5.buttons ? (s4 = 3, void 0 !== t5.button && (s4 = t5.button < 3 ? t5.button : 3)) : s4 = 1 & t5.buttons ? 0 : 4 & t5.buttons ? 1 : 2 & t5.buttons ? 2 : 3;
                break;
              case "mouseup":
                r3 = 0, s4 = t5.button < 3 ? t5.button : 3;
                break;
              case "mousedown":
                r3 = 1, s4 = t5.button < 3 ? t5.button : 3;
                break;
              case "wheel":
                if (e3._customWheelEventHandler && false === e3._customWheelEventHandler(t5)) return false;
                if (0 === e3.viewport.getLinesScrolled(t5)) return false;
                r3 = t5.deltaY < 0 ? 0 : 1, s4 = 4;
                break;
              default:
                return false;
            }
            return !(void 0 === r3 || void 0 === s4 || s4 > 4) && e3.coreMouseService.triggerMouseEvent({ col: i4.col, row: i4.row, x: i4.x, y: i4.y, button: s4, action: r3, ctrl: t5.ctrlKey, alt: t5.altKey, shift: t5.shiftKey });
          }
          const s3 = { mouseup: null, wheel: null, mousedrag: null, mousemove: null }, n3 = { mouseup: (e4) => (i3(e4), e4.buttons || (this._document.removeEventListener("mouseup", s3.mouseup), s3.mousedrag && this._document.removeEventListener("mousemove", s3.mousedrag)), this.cancel(e4)), wheel: (e4) => (i3(e4), this.cancel(e4, true)), mousedrag: (e4) => {
            e4.buttons && i3(e4);
          }, mousemove: (e4) => {
            e4.buttons || i3(e4);
          } };
          this.register(this.coreMouseService.onProtocolChange((e4) => {
            e4 ? ("debug" === this.optionsService.rawOptions.logLevel && this._logService.debug("Binding to mouse events:", this.coreMouseService.explainEvents(e4)), this.element.classList.add("enable-mouse-events"), this._selectionService.disable()) : (this._logService.debug("Unbinding from mouse events."), this.element.classList.remove("enable-mouse-events"), this._selectionService.enable()), 8 & e4 ? s3.mousemove || (t4.addEventListener("mousemove", n3.mousemove), s3.mousemove = n3.mousemove) : (t4.removeEventListener("mousemove", s3.mousemove), s3.mousemove = null), 16 & e4 ? s3.wheel || (t4.addEventListener("wheel", n3.wheel, { passive: false }), s3.wheel = n3.wheel) : (t4.removeEventListener("wheel", s3.wheel), s3.wheel = null), 2 & e4 ? s3.mouseup || (s3.mouseup = n3.mouseup) : (this._document.removeEventListener("mouseup", s3.mouseup), s3.mouseup = null), 4 & e4 ? s3.mousedrag || (s3.mousedrag = n3.mousedrag) : (this._document.removeEventListener("mousemove", s3.mousedrag), s3.mousedrag = null);
          })), this.coreMouseService.activeProtocol = this.coreMouseService.activeProtocol, this.register((0, r2.addDisposableDomListener)(t4, "mousedown", (e4) => {
            if (e4.preventDefault(), this.focus(), this.coreMouseService.areMouseEventsActive && !this._selectionService.shouldForceSelection(e4)) return i3(e4), s3.mouseup && this._document.addEventListener("mouseup", s3.mouseup), s3.mousedrag && this._document.addEventListener("mousemove", s3.mousedrag), this.cancel(e4);
          })), this.register((0, r2.addDisposableDomListener)(t4, "wheel", (e4) => {
            if (!s3.wheel) {
              if (this._customWheelEventHandler && false === this._customWheelEventHandler(e4)) return false;
              if (!this.buffer.hasScrollback) {
                const t5 = this.viewport.getLinesScrolled(e4);
                if (0 === t5) return;
                const i4 = D2.C0.ESC + (this.coreService.decPrivateModes.applicationCursorKeys ? "O" : "[") + (e4.deltaY < 0 ? "A" : "B");
                let s4 = "";
                for (let e5 = 0; e5 < Math.abs(t5); e5++) s4 += i4;
                return this.coreService.triggerDataEvent(s4, true), this.cancel(e4, true);
              }
              return this.viewport.handleWheel(e4) ? this.cancel(e4) : void 0;
            }
          }, { passive: false })), this.register((0, r2.addDisposableDomListener)(t4, "touchstart", (e4) => {
            if (!this.coreMouseService.areMouseEventsActive) return this.viewport.handleTouchStart(e4), this.cancel(e4);
          }, { passive: true })), this.register((0, r2.addDisposableDomListener)(t4, "touchmove", (e4) => {
            if (!this.coreMouseService.areMouseEventsActive) return this.viewport.handleTouchMove(e4) ? void 0 : this.cancel(e4);
          }, { passive: false }));
        }
        refresh(e3, t4) {
          this._renderService?.refreshRows(e3, t4);
        }
        updateCursorStyle(e3) {
          this._selectionService?.shouldColumnSelect(e3) ? this.element.classList.add("column-select") : this.element.classList.remove("column-select");
        }
        _showCursor() {
          this.coreService.isCursorInitialized || (this.coreService.isCursorInitialized = true, this.refresh(this.buffer.y, this.buffer.y));
        }
        scrollLines(e3, t4, i3 = 0) {
          1 === i3 ? (super.scrollLines(e3, t4, i3), this.refresh(0, this.rows - 1)) : this.viewport?.scrollLines(e3);
        }
        paste(e3) {
          (0, s2.paste)(e3, this.textarea, this.coreService, this.optionsService);
        }
        attachCustomKeyEventHandler(e3) {
          this._customKeyEventHandler = e3;
        }
        attachCustomWheelEventHandler(e3) {
          this._customWheelEventHandler = e3;
        }
        registerLinkProvider(e3) {
          return this._linkProviderService.registerLinkProvider(e3);
        }
        registerCharacterJoiner(e3) {
          if (!this._characterJoinerService) throw new Error("Terminal must be opened first");
          const t4 = this._characterJoinerService.register(e3);
          return this.refresh(0, this.rows - 1), t4;
        }
        deregisterCharacterJoiner(e3) {
          if (!this._characterJoinerService) throw new Error("Terminal must be opened first");
          this._characterJoinerService.deregister(e3) && this.refresh(0, this.rows - 1);
        }
        get markers() {
          return this.buffer.markers;
        }
        registerMarker(e3) {
          return this.buffer.addMarker(this.buffer.ybase + this.buffer.y + e3);
        }
        registerDecoration(e3) {
          return this._decorationService.registerDecoration(e3);
        }
        hasSelection() {
          return !!this._selectionService && this._selectionService.hasSelection;
        }
        select(e3, t4, i3) {
          this._selectionService.setSelection(e3, t4, i3);
        }
        getSelection() {
          return this._selectionService ? this._selectionService.selectionText : "";
        }
        getSelectionPosition() {
          if (this._selectionService && this._selectionService.hasSelection) return { start: { x: this._selectionService.selectionStart[0], y: this._selectionService.selectionStart[1] }, end: { x: this._selectionService.selectionEnd[0], y: this._selectionService.selectionEnd[1] } };
        }
        clearSelection() {
          this._selectionService?.clearSelection();
        }
        selectAll() {
          this._selectionService?.selectAll();
        }
        selectLines(e3, t4) {
          this._selectionService?.selectLines(e3, t4);
        }
        _keyDown(e3) {
          if (this._keyDownHandled = false, this._keyDownSeen = true, this._customKeyEventHandler && false === this._customKeyEventHandler(e3)) return false;
          const t4 = this.browser.isMac && this.options.macOptionIsMeta && e3.altKey;
          if (!t4 && !this._compositionHelper.keydown(e3)) return this.options.scrollOnUserInput && this.buffer.ybase !== this.buffer.ydisp && this.scrollToBottom(), false;
          t4 || "Dead" !== e3.key && "AltGraph" !== e3.key || (this._unprocessedDeadKey = true);
          const i3 = (0, R2.evaluateKeyboardEvent)(e3, this.coreService.decPrivateModes.applicationCursorKeys, this.browser.isMac, this.options.macOptionIsMeta);
          if (this.updateCursorStyle(e3), 3 === i3.type || 2 === i3.type) {
            const t5 = this.rows - 1;
            return this.scrollLines(2 === i3.type ? -t5 : t5), this.cancel(e3, true);
          }
          return 1 === i3.type && this.selectAll(), !!this._isThirdLevelShift(this.browser, e3) || (i3.cancel && this.cancel(e3, true), !i3.key || !!(e3.key && !e3.ctrlKey && !e3.altKey && !e3.metaKey && 1 === e3.key.length && e3.key.charCodeAt(0) >= 65 && e3.key.charCodeAt(0) <= 90) || (this._unprocessedDeadKey ? (this._unprocessedDeadKey = false, true) : (i3.key !== D2.C0.ETX && i3.key !== D2.C0.CR || (this.textarea.value = ""), this._onKey.fire({ key: i3.key, domEvent: e3 }), this._showCursor(), this.coreService.triggerDataEvent(i3.key, true), !this.optionsService.rawOptions.screenReaderMode || e3.altKey || e3.ctrlKey ? this.cancel(e3, true) : void (this._keyDownHandled = true))));
        }
        _isThirdLevelShift(e3, t4) {
          const i3 = e3.isMac && !this.options.macOptionIsMeta && t4.altKey && !t4.ctrlKey && !t4.metaKey || e3.isWindows && t4.altKey && t4.ctrlKey && !t4.metaKey || e3.isWindows && t4.getModifierState("AltGraph");
          return "keypress" === t4.type ? i3 : i3 && (!t4.keyCode || t4.keyCode > 47);
        }
        _keyUp(e3) {
          this._keyDownSeen = false, this._customKeyEventHandler && false === this._customKeyEventHandler(e3) || (function(e4) {
            return 16 === e4.keyCode || 17 === e4.keyCode || 18 === e4.keyCode;
          }(e3) || this.focus(), this.updateCursorStyle(e3), this._keyPressHandled = false);
        }
        _keyPress(e3) {
          let t4;
          if (this._keyPressHandled = false, this._keyDownHandled) return false;
          if (this._customKeyEventHandler && false === this._customKeyEventHandler(e3)) return false;
          if (this.cancel(e3), e3.charCode) t4 = e3.charCode;
          else if (null === e3.which || void 0 === e3.which) t4 = e3.keyCode;
          else {
            if (0 === e3.which || 0 === e3.charCode) return false;
            t4 = e3.which;
          }
          return !(!t4 || (e3.altKey || e3.ctrlKey || e3.metaKey) && !this._isThirdLevelShift(this.browser, e3) || (t4 = String.fromCharCode(t4), this._onKey.fire({ key: t4, domEvent: e3 }), this._showCursor(), this.coreService.triggerDataEvent(t4, true), this._keyPressHandled = true, this._unprocessedDeadKey = false, 0));
        }
        _inputEvent(e3) {
          if (e3.data && "insertText" === e3.inputType && (!e3.composed || !this._keyDownSeen) && !this.optionsService.rawOptions.screenReaderMode) {
            if (this._keyPressHandled) return false;
            this._unprocessedDeadKey = false;
            const t4 = e3.data;
            return this.coreService.triggerDataEvent(t4, true), this.cancel(e3), true;
          }
          return false;
        }
        resize(e3, t4) {
          e3 !== this.cols || t4 !== this.rows ? super.resize(e3, t4) : this._charSizeService && !this._charSizeService.hasValidSize && this._charSizeService.measure();
        }
        _afterResize(e3, t4) {
          this._charSizeService?.measure(), this.viewport?.syncScrollArea(true);
        }
        clear() {
          if (0 !== this.buffer.ybase || 0 !== this.buffer.y) {
            this.buffer.clearAllMarkers(), this.buffer.lines.set(0, this.buffer.lines.get(this.buffer.ybase + this.buffer.y)), this.buffer.lines.length = 1, this.buffer.ydisp = 0, this.buffer.ybase = 0, this.buffer.y = 0;
            for (let e3 = 1; e3 < this.rows; e3++) this.buffer.lines.push(this.buffer.getBlankLine(L2.DEFAULT_ATTR_DATA));
            this._onScroll.fire({ position: this.buffer.ydisp, source: 0 }), this.viewport?.reset(), this.refresh(0, this.rows - 1);
          }
        }
        reset() {
          this.options.rows = this.rows, this.options.cols = this.cols;
          const e3 = this._customKeyEventHandler;
          this._setup(), super.reset(), this._selectionService?.reset(), this._decorationService.reset(), this.viewport?.reset(), this._customKeyEventHandler = e3, this.refresh(0, this.rows - 1);
        }
        clearTextureAtlas() {
          this._renderService?.clearTextureAtlas();
        }
        _reportFocus() {
          this.element?.classList.contains("focus") ? this.coreService.triggerDataEvent(D2.C0.ESC + "[I") : this.coreService.triggerDataEvent(D2.C0.ESC + "[O");
        }
        _reportWindowsOptions(e3) {
          if (this._renderService) switch (e3) {
            case T2.WindowsOptionsReportType.GET_WIN_SIZE_PIXELS:
              const e4 = this._renderService.dimensions.css.canvas.width.toFixed(0), t4 = this._renderService.dimensions.css.canvas.height.toFixed(0);
              this.coreService.triggerDataEvent(`${D2.C0.ESC}[4;${t4};${e4}t`);
              break;
            case T2.WindowsOptionsReportType.GET_CELL_SIZE_PIXELS:
              const i3 = this._renderService.dimensions.css.cell.width.toFixed(0), s3 = this._renderService.dimensions.css.cell.height.toFixed(0);
              this.coreService.triggerDataEvent(`${D2.C0.ESC}[6;${s3};${i3}t`);
          }
        }
        cancel(e3, t4) {
          if (this.options.cancelEvents || t4) return e3.preventDefault(), e3.stopPropagation(), false;
        }
      }
      t3.Terminal = P2;
    }, 9924: (e2, t3) => {
      Object.defineProperty(t3, "__esModule", { value: true }), t3.TimeBasedDebouncer = void 0, t3.TimeBasedDebouncer = class {
        constructor(e3, t4 = 1e3) {
          this._renderCallback = e3, this._debounceThresholdMS = t4, this._lastRefreshMs = 0, this._additionalRefreshRequested = false;
        }
        dispose() {
          this._refreshTimeoutID && clearTimeout(this._refreshTimeoutID);
        }
        refresh(e3, t4, i2) {
          this._rowCount = i2, e3 = void 0 !== e3 ? e3 : 0, t4 = void 0 !== t4 ? t4 : this._rowCount - 1, this._rowStart = void 0 !== this._rowStart ? Math.min(this._rowStart, e3) : e3, this._rowEnd = void 0 !== this._rowEnd ? Math.max(this._rowEnd, t4) : t4;
          const s2 = Date.now();
          if (s2 - this._lastRefreshMs >= this._debounceThresholdMS) this._lastRefreshMs = s2, this._innerRefresh();
          else if (!this._additionalRefreshRequested) {
            const e4 = s2 - this._lastRefreshMs, t5 = this._debounceThresholdMS - e4;
            this._additionalRefreshRequested = true, this._refreshTimeoutID = window.setTimeout(() => {
              this._lastRefreshMs = Date.now(), this._innerRefresh(), this._additionalRefreshRequested = false, this._refreshTimeoutID = void 0;
            }, t5);
          }
        }
        _innerRefresh() {
          if (void 0 === this._rowStart || void 0 === this._rowEnd || void 0 === this._rowCount) return;
          const e3 = Math.max(this._rowStart, 0), t4 = Math.min(this._rowEnd, this._rowCount - 1);
          this._rowStart = void 0, this._rowEnd = void 0, this._renderCallback(e3, t4);
        }
      };
    }, 1680: function(e2, t3, i2) {
      var s2 = this && this.__decorate || function(e3, t4, i3, s3) {
        var r3, n3 = arguments.length, o2 = n3 < 3 ? t4 : null === s3 ? s3 = Object.getOwnPropertyDescriptor(t4, i3) : s3;
        if ("object" == typeof Reflect && "function" == typeof Reflect.decorate) o2 = Reflect.decorate(e3, t4, i3, s3);
        else for (var a2 = e3.length - 1; a2 >= 0; a2--) (r3 = e3[a2]) && (o2 = (n3 < 3 ? r3(o2) : n3 > 3 ? r3(t4, i3, o2) : r3(t4, i3)) || o2);
        return n3 > 3 && o2 && Object.defineProperty(t4, i3, o2), o2;
      }, r2 = this && this.__param || function(e3, t4) {
        return function(i3, s3) {
          t4(i3, s3, e3);
        };
      };
      Object.defineProperty(t3, "__esModule", { value: true }), t3.Viewport = void 0;
      const n2 = i2(3656), o = i2(4725), a = i2(8460), h = i2(844), c = i2(2585);
      let l2 = t3.Viewport = class extends h.Disposable {
        constructor(e3, t4, i3, s3, r3, o2, h2, c2) {
          super(), this._viewportElement = e3, this._scrollArea = t4, this._bufferService = i3, this._optionsService = s3, this._charSizeService = r3, this._renderService = o2, this._coreBrowserService = h2, this.scrollBarWidth = 0, this._currentRowHeight = 0, this._currentDeviceCellHeight = 0, this._lastRecordedBufferLength = 0, this._lastRecordedViewportHeight = 0, this._lastRecordedBufferHeight = 0, this._lastTouchY = 0, this._lastScrollTop = 0, this._wheelPartialScroll = 0, this._refreshAnimationFrame = null, this._ignoreNextScrollEvent = false, this._smoothScrollState = { startTime: 0, origin: -1, target: -1 }, this._onRequestScrollLines = this.register(new a.EventEmitter()), this.onRequestScrollLines = this._onRequestScrollLines.event, this.scrollBarWidth = this._viewportElement.offsetWidth - this._scrollArea.offsetWidth || 15, this.register((0, n2.addDisposableDomListener)(this._viewportElement, "scroll", this._handleScroll.bind(this))), this._activeBuffer = this._bufferService.buffer, this.register(this._bufferService.buffers.onBufferActivate((e4) => this._activeBuffer = e4.activeBuffer)), this._renderDimensions = this._renderService.dimensions, this.register(this._renderService.onDimensionsChange((e4) => this._renderDimensions = e4)), this._handleThemeChange(c2.colors), this.register(c2.onChangeColors((e4) => this._handleThemeChange(e4))), this.register(this._optionsService.onSpecificOptionChange("scrollback", () => this.syncScrollArea())), setTimeout(() => this.syncScrollArea());
        }
        _handleThemeChange(e3) {
          this._viewportElement.style.backgroundColor = e3.background.css;
        }
        reset() {
          this._currentRowHeight = 0, this._currentDeviceCellHeight = 0, this._lastRecordedBufferLength = 0, this._lastRecordedViewportHeight = 0, this._lastRecordedBufferHeight = 0, this._lastTouchY = 0, this._lastScrollTop = 0, this._coreBrowserService.window.requestAnimationFrame(() => this.syncScrollArea());
        }
        _refresh(e3) {
          if (e3) return this._innerRefresh(), void (null !== this._refreshAnimationFrame && this._coreBrowserService.window.cancelAnimationFrame(this._refreshAnimationFrame));
          null === this._refreshAnimationFrame && (this._refreshAnimationFrame = this._coreBrowserService.window.requestAnimationFrame(() => this._innerRefresh()));
        }
        _innerRefresh() {
          if (this._charSizeService.height > 0) {
            this._currentRowHeight = this._renderDimensions.device.cell.height / this._coreBrowserService.dpr, this._currentDeviceCellHeight = this._renderDimensions.device.cell.height, this._lastRecordedViewportHeight = this._viewportElement.offsetHeight;
            const e4 = Math.round(this._currentRowHeight * this._lastRecordedBufferLength) + (this._lastRecordedViewportHeight - this._renderDimensions.css.canvas.height);
            this._lastRecordedBufferHeight !== e4 && (this._lastRecordedBufferHeight = e4, this._scrollArea.style.height = this._lastRecordedBufferHeight + "px");
          }
          const e3 = this._bufferService.buffer.ydisp * this._currentRowHeight;
          this._viewportElement.scrollTop !== e3 && (this._ignoreNextScrollEvent = true, this._viewportElement.scrollTop = e3), this._refreshAnimationFrame = null;
        }
        syncScrollArea(e3 = false) {
          if (this._lastRecordedBufferLength !== this._bufferService.buffer.lines.length) return this._lastRecordedBufferLength = this._bufferService.buffer.lines.length, void this._refresh(e3);
          this._lastRecordedViewportHeight === this._renderService.dimensions.css.canvas.height && this._lastScrollTop === this._activeBuffer.ydisp * this._currentRowHeight && this._renderDimensions.device.cell.height === this._currentDeviceCellHeight || this._refresh(e3);
        }
        _handleScroll(e3) {
          if (this._lastScrollTop = this._viewportElement.scrollTop, !this._viewportElement.offsetParent) return;
          if (this._ignoreNextScrollEvent) return this._ignoreNextScrollEvent = false, void this._onRequestScrollLines.fire({ amount: 0, suppressScrollEvent: true });
          const t4 = Math.round(this._lastScrollTop / this._currentRowHeight) - this._bufferService.buffer.ydisp;
          this._onRequestScrollLines.fire({ amount: t4, suppressScrollEvent: true });
        }
        _smoothScroll() {
          if (this._isDisposed || -1 === this._smoothScrollState.origin || -1 === this._smoothScrollState.target) return;
          const e3 = this._smoothScrollPercent();
          this._viewportElement.scrollTop = this._smoothScrollState.origin + Math.round(e3 * (this._smoothScrollState.target - this._smoothScrollState.origin)), e3 < 1 ? this._coreBrowserService.window.requestAnimationFrame(() => this._smoothScroll()) : this._clearSmoothScrollState();
        }
        _smoothScrollPercent() {
          return this._optionsService.rawOptions.smoothScrollDuration && this._smoothScrollState.startTime ? Math.max(Math.min((Date.now() - this._smoothScrollState.startTime) / this._optionsService.rawOptions.smoothScrollDuration, 1), 0) : 1;
        }
        _clearSmoothScrollState() {
          this._smoothScrollState.startTime = 0, this._smoothScrollState.origin = -1, this._smoothScrollState.target = -1;
        }
        _bubbleScroll(e3, t4) {
          const i3 = this._viewportElement.scrollTop + this._lastRecordedViewportHeight;
          return !(t4 < 0 && 0 !== this._viewportElement.scrollTop || t4 > 0 && i3 < this._lastRecordedBufferHeight) || (e3.cancelable && e3.preventDefault(), false);
        }
        handleWheel(e3) {
          const t4 = this._getPixelsScrolled(e3);
          return 0 !== t4 && (this._optionsService.rawOptions.smoothScrollDuration ? (this._smoothScrollState.startTime = Date.now(), this._smoothScrollPercent() < 1 ? (this._smoothScrollState.origin = this._viewportElement.scrollTop, -1 === this._smoothScrollState.target ? this._smoothScrollState.target = this._viewportElement.scrollTop + t4 : this._smoothScrollState.target += t4, this._smoothScrollState.target = Math.max(Math.min(this._smoothScrollState.target, this._viewportElement.scrollHeight), 0), this._smoothScroll()) : this._clearSmoothScrollState()) : this._viewportElement.scrollTop += t4, this._bubbleScroll(e3, t4));
        }
        scrollLines(e3) {
          if (0 !== e3) if (this._optionsService.rawOptions.smoothScrollDuration) {
            const t4 = e3 * this._currentRowHeight;
            this._smoothScrollState.startTime = Date.now(), this._smoothScrollPercent() < 1 ? (this._smoothScrollState.origin = this._viewportElement.scrollTop, this._smoothScrollState.target = this._smoothScrollState.origin + t4, this._smoothScrollState.target = Math.max(Math.min(this._smoothScrollState.target, this._viewportElement.scrollHeight), 0), this._smoothScroll()) : this._clearSmoothScrollState();
          } else this._onRequestScrollLines.fire({ amount: e3, suppressScrollEvent: false });
        }
        _getPixelsScrolled(e3) {
          if (0 === e3.deltaY || e3.shiftKey) return 0;
          let t4 = this._applyScrollModifier(e3.deltaY, e3);
          return e3.deltaMode === WheelEvent.DOM_DELTA_LINE ? t4 *= this._currentRowHeight : e3.deltaMode === WheelEvent.DOM_DELTA_PAGE && (t4 *= this._currentRowHeight * this._bufferService.rows), t4;
        }
        getBufferElements(e3, t4) {
          let i3, s3 = "";
          const r3 = [], n3 = t4 ?? this._bufferService.buffer.lines.length, o2 = this._bufferService.buffer.lines;
          for (let t5 = e3; t5 < n3; t5++) {
            const e4 = o2.get(t5);
            if (!e4) continue;
            const n4 = o2.get(t5 + 1)?.isWrapped;
            if (s3 += e4.translateToString(!n4), !n4 || t5 === o2.length - 1) {
              const e5 = document.createElement("div");
              e5.textContent = s3, r3.push(e5), s3.length > 0 && (i3 = e5), s3 = "";
            }
          }
          return { bufferElements: r3, cursorElement: i3 };
        }
        getLinesScrolled(e3) {
          if (0 === e3.deltaY || e3.shiftKey) return 0;
          let t4 = this._applyScrollModifier(e3.deltaY, e3);
          return e3.deltaMode === WheelEvent.DOM_DELTA_PIXEL ? (t4 /= this._currentRowHeight + 0, this._wheelPartialScroll += t4, t4 = Math.floor(Math.abs(this._wheelPartialScroll)) * (this._wheelPartialScroll > 0 ? 1 : -1), this._wheelPartialScroll %= 1) : e3.deltaMode === WheelEvent.DOM_DELTA_PAGE && (t4 *= this._bufferService.rows), t4;
        }
        _applyScrollModifier(e3, t4) {
          const i3 = this._optionsService.rawOptions.fastScrollModifier;
          return "alt" === i3 && t4.altKey || "ctrl" === i3 && t4.ctrlKey || "shift" === i3 && t4.shiftKey ? e3 * this._optionsService.rawOptions.fastScrollSensitivity * this._optionsService.rawOptions.scrollSensitivity : e3 * this._optionsService.rawOptions.scrollSensitivity;
        }
        handleTouchStart(e3) {
          this._lastTouchY = e3.touches[0].pageY;
        }
        handleTouchMove(e3) {
          const t4 = this._lastTouchY - e3.touches[0].pageY;
          return this._lastTouchY = e3.touches[0].pageY, 0 !== t4 && (this._viewportElement.scrollTop += t4, this._bubbleScroll(e3, t4));
        }
      };
      t3.Viewport = l2 = s2([r2(2, c.IBufferService), r2(3, c.IOptionsService), r2(4, o.ICharSizeService), r2(5, o.IRenderService), r2(6, o.ICoreBrowserService), r2(7, o.IThemeService)], l2);
    }, 3107: function(e2, t3, i2) {
      var s2 = this && this.__decorate || function(e3, t4, i3, s3) {
        var r3, n3 = arguments.length, o2 = n3 < 3 ? t4 : null === s3 ? s3 = Object.getOwnPropertyDescriptor(t4, i3) : s3;
        if ("object" == typeof Reflect && "function" == typeof Reflect.decorate) o2 = Reflect.decorate(e3, t4, i3, s3);
        else for (var a2 = e3.length - 1; a2 >= 0; a2--) (r3 = e3[a2]) && (o2 = (n3 < 3 ? r3(o2) : n3 > 3 ? r3(t4, i3, o2) : r3(t4, i3)) || o2);
        return n3 > 3 && o2 && Object.defineProperty(t4, i3, o2), o2;
      }, r2 = this && this.__param || function(e3, t4) {
        return function(i3, s3) {
          t4(i3, s3, e3);
        };
      };
      Object.defineProperty(t3, "__esModule", { value: true }), t3.BufferDecorationRenderer = void 0;
      const n2 = i2(4725), o = i2(844), a = i2(2585);
      let h = t3.BufferDecorationRenderer = class extends o.Disposable {
        constructor(e3, t4, i3, s3, r3) {
          super(), this._screenElement = e3, this._bufferService = t4, this._coreBrowserService = i3, this._decorationService = s3, this._renderService = r3, this._decorationElements = /* @__PURE__ */ new Map(), this._altBufferIsActive = false, this._dimensionsChanged = false, this._container = document.createElement("div"), this._container.classList.add("xterm-decoration-container"), this._screenElement.appendChild(this._container), this.register(this._renderService.onRenderedViewportChange(() => this._doRefreshDecorations())), this.register(this._renderService.onDimensionsChange(() => {
            this._dimensionsChanged = true, this._queueRefresh();
          })), this.register(this._coreBrowserService.onDprChange(() => this._queueRefresh())), this.register(this._bufferService.buffers.onBufferActivate(() => {
            this._altBufferIsActive = this._bufferService.buffer === this._bufferService.buffers.alt;
          })), this.register(this._decorationService.onDecorationRegistered(() => this._queueRefresh())), this.register(this._decorationService.onDecorationRemoved((e4) => this._removeDecoration(e4))), this.register((0, o.toDisposable)(() => {
            this._container.remove(), this._decorationElements.clear();
          }));
        }
        _queueRefresh() {
          void 0 === this._animationFrame && (this._animationFrame = this._renderService.addRefreshCallback(() => {
            this._doRefreshDecorations(), this._animationFrame = void 0;
          }));
        }
        _doRefreshDecorations() {
          for (const e3 of this._decorationService.decorations) this._renderDecoration(e3);
          this._dimensionsChanged = false;
        }
        _renderDecoration(e3) {
          this._refreshStyle(e3), this._dimensionsChanged && this._refreshXPosition(e3);
        }
        _createElement(e3) {
          const t4 = this._coreBrowserService.mainDocument.createElement("div");
          t4.classList.add("xterm-decoration"), t4.classList.toggle("xterm-decoration-top-layer", "top" === e3?.options?.layer), t4.style.width = `${Math.round((e3.options.width || 1) * this._renderService.dimensions.css.cell.width)}px`, t4.style.height = (e3.options.height || 1) * this._renderService.dimensions.css.cell.height + "px", t4.style.top = (e3.marker.line - this._bufferService.buffers.active.ydisp) * this._renderService.dimensions.css.cell.height + "px", t4.style.lineHeight = `${this._renderService.dimensions.css.cell.height}px`;
          const i3 = e3.options.x ?? 0;
          return i3 && i3 > this._bufferService.cols && (t4.style.display = "none"), this._refreshXPosition(e3, t4), t4;
        }
        _refreshStyle(e3) {
          const t4 = e3.marker.line - this._bufferService.buffers.active.ydisp;
          if (t4 < 0 || t4 >= this._bufferService.rows) e3.element && (e3.element.style.display = "none", e3.onRenderEmitter.fire(e3.element));
          else {
            let i3 = this._decorationElements.get(e3);
            i3 || (i3 = this._createElement(e3), e3.element = i3, this._decorationElements.set(e3, i3), this._container.appendChild(i3), e3.onDispose(() => {
              this._decorationElements.delete(e3), i3.remove();
            })), i3.style.top = t4 * this._renderService.dimensions.css.cell.height + "px", i3.style.display = this._altBufferIsActive ? "none" : "block", e3.onRenderEmitter.fire(i3);
          }
        }
        _refreshXPosition(e3, t4 = e3.element) {
          if (!t4) return;
          const i3 = e3.options.x ?? 0;
          "right" === (e3.options.anchor || "left") ? t4.style.right = i3 ? i3 * this._renderService.dimensions.css.cell.width + "px" : "" : t4.style.left = i3 ? i3 * this._renderService.dimensions.css.cell.width + "px" : "";
        }
        _removeDecoration(e3) {
          this._decorationElements.get(e3)?.remove(), this._decorationElements.delete(e3), e3.dispose();
        }
      };
      t3.BufferDecorationRenderer = h = s2([r2(1, a.IBufferService), r2(2, n2.ICoreBrowserService), r2(3, a.IDecorationService), r2(4, n2.IRenderService)], h);
    }, 5871: (e2, t3) => {
      Object.defineProperty(t3, "__esModule", { value: true }), t3.ColorZoneStore = void 0, t3.ColorZoneStore = class {
        constructor() {
          this._zones = [], this._zonePool = [], this._zonePoolIndex = 0, this._linePadding = { full: 0, left: 0, center: 0, right: 0 };
        }
        get zones() {
          return this._zonePool.length = Math.min(this._zonePool.length, this._zones.length), this._zones;
        }
        clear() {
          this._zones.length = 0, this._zonePoolIndex = 0;
        }
        addDecoration(e3) {
          if (e3.options.overviewRulerOptions) {
            for (const t4 of this._zones) if (t4.color === e3.options.overviewRulerOptions.color && t4.position === e3.options.overviewRulerOptions.position) {
              if (this._lineIntersectsZone(t4, e3.marker.line)) return;
              if (this._lineAdjacentToZone(t4, e3.marker.line, e3.options.overviewRulerOptions.position)) return void this._addLineToZone(t4, e3.marker.line);
            }
            if (this._zonePoolIndex < this._zonePool.length) return this._zonePool[this._zonePoolIndex].color = e3.options.overviewRulerOptions.color, this._zonePool[this._zonePoolIndex].position = e3.options.overviewRulerOptions.position, this._zonePool[this._zonePoolIndex].startBufferLine = e3.marker.line, this._zonePool[this._zonePoolIndex].endBufferLine = e3.marker.line, void this._zones.push(this._zonePool[this._zonePoolIndex++]);
            this._zones.push({ color: e3.options.overviewRulerOptions.color, position: e3.options.overviewRulerOptions.position, startBufferLine: e3.marker.line, endBufferLine: e3.marker.line }), this._zonePool.push(this._zones[this._zones.length - 1]), this._zonePoolIndex++;
          }
        }
        setPadding(e3) {
          this._linePadding = e3;
        }
        _lineIntersectsZone(e3, t4) {
          return t4 >= e3.startBufferLine && t4 <= e3.endBufferLine;
        }
        _lineAdjacentToZone(e3, t4, i2) {
          return t4 >= e3.startBufferLine - this._linePadding[i2 || "full"] && t4 <= e3.endBufferLine + this._linePadding[i2 || "full"];
        }
        _addLineToZone(e3, t4) {
          e3.startBufferLine = Math.min(e3.startBufferLine, t4), e3.endBufferLine = Math.max(e3.endBufferLine, t4);
        }
      };
    }, 5744: function(e2, t3, i2) {
      var s2 = this && this.__decorate || function(e3, t4, i3, s3) {
        var r3, n3 = arguments.length, o2 = n3 < 3 ? t4 : null === s3 ? s3 = Object.getOwnPropertyDescriptor(t4, i3) : s3;
        if ("object" == typeof Reflect && "function" == typeof Reflect.decorate) o2 = Reflect.decorate(e3, t4, i3, s3);
        else for (var a2 = e3.length - 1; a2 >= 0; a2--) (r3 = e3[a2]) && (o2 = (n3 < 3 ? r3(o2) : n3 > 3 ? r3(t4, i3, o2) : r3(t4, i3)) || o2);
        return n3 > 3 && o2 && Object.defineProperty(t4, i3, o2), o2;
      }, r2 = this && this.__param || function(e3, t4) {
        return function(i3, s3) {
          t4(i3, s3, e3);
        };
      };
      Object.defineProperty(t3, "__esModule", { value: true }), t3.OverviewRulerRenderer = void 0;
      const n2 = i2(5871), o = i2(4725), a = i2(844), h = i2(2585), c = { full: 0, left: 0, center: 0, right: 0 }, l2 = { full: 0, left: 0, center: 0, right: 0 }, d = { full: 0, left: 0, center: 0, right: 0 };
      let _ = t3.OverviewRulerRenderer = class extends a.Disposable {
        get _width() {
          return this._optionsService.options.overviewRulerWidth || 0;
        }
        constructor(e3, t4, i3, s3, r3, o2, h2) {
          super(), this._viewportElement = e3, this._screenElement = t4, this._bufferService = i3, this._decorationService = s3, this._renderService = r3, this._optionsService = o2, this._coreBrowserService = h2, this._colorZoneStore = new n2.ColorZoneStore(), this._shouldUpdateDimensions = true, this._shouldUpdateAnchor = true, this._lastKnownBufferLength = 0, this._canvas = this._coreBrowserService.mainDocument.createElement("canvas"), this._canvas.classList.add("xterm-decoration-overview-ruler"), this._refreshCanvasDimensions(), this._viewportElement.parentElement?.insertBefore(this._canvas, this._viewportElement);
          const c2 = this._canvas.getContext("2d");
          if (!c2) throw new Error("Ctx cannot be null");
          this._ctx = c2, this._registerDecorationListeners(), this._registerBufferChangeListeners(), this._registerDimensionChangeListeners(), this.register((0, a.toDisposable)(() => {
            this._canvas?.remove();
          }));
        }
        _registerDecorationListeners() {
          this.register(this._decorationService.onDecorationRegistered(() => this._queueRefresh(void 0, true))), this.register(this._decorationService.onDecorationRemoved(() => this._queueRefresh(void 0, true)));
        }
        _registerBufferChangeListeners() {
          this.register(this._renderService.onRenderedViewportChange(() => this._queueRefresh())), this.register(this._bufferService.buffers.onBufferActivate(() => {
            this._canvas.style.display = this._bufferService.buffer === this._bufferService.buffers.alt ? "none" : "block";
          })), this.register(this._bufferService.onScroll(() => {
            this._lastKnownBufferLength !== this._bufferService.buffers.normal.lines.length && (this._refreshDrawHeightConstants(), this._refreshColorZonePadding());
          }));
        }
        _registerDimensionChangeListeners() {
          this.register(this._renderService.onRender(() => {
            this._containerHeight && this._containerHeight === this._screenElement.clientHeight || (this._queueRefresh(true), this._containerHeight = this._screenElement.clientHeight);
          })), this.register(this._optionsService.onSpecificOptionChange("overviewRulerWidth", () => this._queueRefresh(true))), this.register(this._coreBrowserService.onDprChange(() => this._queueRefresh(true))), this._queueRefresh(true);
        }
        _refreshDrawConstants() {
          const e3 = Math.floor(this._canvas.width / 3), t4 = Math.ceil(this._canvas.width / 3);
          l2.full = this._canvas.width, l2.left = e3, l2.center = t4, l2.right = e3, this._refreshDrawHeightConstants(), d.full = 0, d.left = 0, d.center = l2.left, d.right = l2.left + l2.center;
        }
        _refreshDrawHeightConstants() {
          c.full = Math.round(2 * this._coreBrowserService.dpr);
          const e3 = this._canvas.height / this._bufferService.buffer.lines.length, t4 = Math.round(Math.max(Math.min(e3, 12), 6) * this._coreBrowserService.dpr);
          c.left = t4, c.center = t4, c.right = t4;
        }
        _refreshColorZonePadding() {
          this._colorZoneStore.setPadding({ full: Math.floor(this._bufferService.buffers.active.lines.length / (this._canvas.height - 1) * c.full), left: Math.floor(this._bufferService.buffers.active.lines.length / (this._canvas.height - 1) * c.left), center: Math.floor(this._bufferService.buffers.active.lines.length / (this._canvas.height - 1) * c.center), right: Math.floor(this._bufferService.buffers.active.lines.length / (this._canvas.height - 1) * c.right) }), this._lastKnownBufferLength = this._bufferService.buffers.normal.lines.length;
        }
        _refreshCanvasDimensions() {
          this._canvas.style.width = `${this._width}px`, this._canvas.width = Math.round(this._width * this._coreBrowserService.dpr), this._canvas.style.height = `${this._screenElement.clientHeight}px`, this._canvas.height = Math.round(this._screenElement.clientHeight * this._coreBrowserService.dpr), this._refreshDrawConstants(), this._refreshColorZonePadding();
        }
        _refreshDecorations() {
          this._shouldUpdateDimensions && this._refreshCanvasDimensions(), this._ctx.clearRect(0, 0, this._canvas.width, this._canvas.height), this._colorZoneStore.clear();
          for (const e4 of this._decorationService.decorations) this._colorZoneStore.addDecoration(e4);
          this._ctx.lineWidth = 1;
          const e3 = this._colorZoneStore.zones;
          for (const t4 of e3) "full" !== t4.position && this._renderColorZone(t4);
          for (const t4 of e3) "full" === t4.position && this._renderColorZone(t4);
          this._shouldUpdateDimensions = false, this._shouldUpdateAnchor = false;
        }
        _renderColorZone(e3) {
          this._ctx.fillStyle = e3.color, this._ctx.fillRect(d[e3.position || "full"], Math.round((this._canvas.height - 1) * (e3.startBufferLine / this._bufferService.buffers.active.lines.length) - c[e3.position || "full"] / 2), l2[e3.position || "full"], Math.round((this._canvas.height - 1) * ((e3.endBufferLine - e3.startBufferLine) / this._bufferService.buffers.active.lines.length) + c[e3.position || "full"]));
        }
        _queueRefresh(e3, t4) {
          this._shouldUpdateDimensions = e3 || this._shouldUpdateDimensions, this._shouldUpdateAnchor = t4 || this._shouldUpdateAnchor, void 0 === this._animationFrame && (this._animationFrame = this._coreBrowserService.window.requestAnimationFrame(() => {
            this._refreshDecorations(), this._animationFrame = void 0;
          }));
        }
      };
      t3.OverviewRulerRenderer = _ = s2([r2(2, h.IBufferService), r2(3, h.IDecorationService), r2(4, o.IRenderService), r2(5, h.IOptionsService), r2(6, o.ICoreBrowserService)], _);
    }, 2950: function(e2, t3, i2) {
      var s2 = this && this.__decorate || function(e3, t4, i3, s3) {
        var r3, n3 = arguments.length, o2 = n3 < 3 ? t4 : null === s3 ? s3 = Object.getOwnPropertyDescriptor(t4, i3) : s3;
        if ("object" == typeof Reflect && "function" == typeof Reflect.decorate) o2 = Reflect.decorate(e3, t4, i3, s3);
        else for (var a2 = e3.length - 1; a2 >= 0; a2--) (r3 = e3[a2]) && (o2 = (n3 < 3 ? r3(o2) : n3 > 3 ? r3(t4, i3, o2) : r3(t4, i3)) || o2);
        return n3 > 3 && o2 && Object.defineProperty(t4, i3, o2), o2;
      }, r2 = this && this.__param || function(e3, t4) {
        return function(i3, s3) {
          t4(i3, s3, e3);
        };
      };
      Object.defineProperty(t3, "__esModule", { value: true }), t3.CompositionHelper = void 0;
      const n2 = i2(4725), o = i2(2585), a = i2(2584);
      let h = t3.CompositionHelper = class {
        get isComposing() {
          return this._isComposing;
        }
        constructor(e3, t4, i3, s3, r3, n3) {
          this._textarea = e3, this._compositionView = t4, this._bufferService = i3, this._optionsService = s3, this._coreService = r3, this._renderService = n3, this._isComposing = false, this._isSendingComposition = false, this._compositionPosition = { start: 0, end: 0 }, this._dataAlreadySent = "";
        }
        compositionstart() {
          this._isComposing = true, this._compositionPosition.start = this._textarea.value.length, this._compositionView.textContent = "", this._dataAlreadySent = "", this._compositionView.classList.add("active");
        }
        compositionupdate(e3) {
          this._compositionView.textContent = e3.data, this.updateCompositionElements(), setTimeout(() => {
            this._compositionPosition.end = this._textarea.value.length;
          }, 0);
        }
        compositionend() {
          this._finalizeComposition(true);
        }
        keydown(e3) {
          if (this._isComposing || this._isSendingComposition) {
            if (229 === e3.keyCode) return false;
            if (16 === e3.keyCode || 17 === e3.keyCode || 18 === e3.keyCode) return false;
            this._finalizeComposition(false);
          }
          return 229 !== e3.keyCode || (this._handleAnyTextareaChanges(), false);
        }
        _finalizeComposition(e3) {
          if (this._compositionView.classList.remove("active"), this._isComposing = false, e3) {
            const e4 = { start: this._compositionPosition.start, end: this._compositionPosition.end };
            this._isSendingComposition = true, setTimeout(() => {
              if (this._isSendingComposition) {
                let t4;
                this._isSendingComposition = false, e4.start += this._dataAlreadySent.length, t4 = this._isComposing ? this._textarea.value.substring(e4.start, e4.end) : this._textarea.value.substring(e4.start), t4.length > 0 && this._coreService.triggerDataEvent(t4, true);
              }
            }, 0);
          } else {
            this._isSendingComposition = false;
            const e4 = this._textarea.value.substring(this._compositionPosition.start, this._compositionPosition.end);
            this._coreService.triggerDataEvent(e4, true);
          }
        }
        _handleAnyTextareaChanges() {
          const e3 = this._textarea.value;
          setTimeout(() => {
            if (!this._isComposing) {
              const t4 = this._textarea.value, i3 = t4.replace(e3, "");
              this._dataAlreadySent = i3, t4.length > e3.length ? this._coreService.triggerDataEvent(i3, true) : t4.length < e3.length ? this._coreService.triggerDataEvent(`${a.C0.DEL}`, true) : t4.length === e3.length && t4 !== e3 && this._coreService.triggerDataEvent(t4, true);
            }
          }, 0);
        }
        updateCompositionElements(e3) {
          if (this._isComposing) {
            if (this._bufferService.buffer.isCursorInViewport) {
              const e4 = Math.min(this._bufferService.buffer.x, this._bufferService.cols - 1), t4 = this._renderService.dimensions.css.cell.height, i3 = this._bufferService.buffer.y * this._renderService.dimensions.css.cell.height, s3 = e4 * this._renderService.dimensions.css.cell.width;
              this._compositionView.style.left = s3 + "px", this._compositionView.style.top = i3 + "px", this._compositionView.style.height = t4 + "px", this._compositionView.style.lineHeight = t4 + "px", this._compositionView.style.fontFamily = this._optionsService.rawOptions.fontFamily, this._compositionView.style.fontSize = this._optionsService.rawOptions.fontSize + "px";
              const r3 = this._compositionView.getBoundingClientRect();
              this._textarea.style.left = s3 + "px", this._textarea.style.top = i3 + "px", this._textarea.style.width = Math.max(r3.width, 1) + "px", this._textarea.style.height = Math.max(r3.height, 1) + "px", this._textarea.style.lineHeight = r3.height + "px";
            }
            e3 || setTimeout(() => this.updateCompositionElements(true), 0);
          }
        }
      };
      t3.CompositionHelper = h = s2([r2(2, o.IBufferService), r2(3, o.IOptionsService), r2(4, o.ICoreService), r2(5, n2.IRenderService)], h);
    }, 9806: (e2, t3) => {
      function i2(e3, t4, i3) {
        const s2 = i3.getBoundingClientRect(), r2 = e3.getComputedStyle(i3), n2 = parseInt(r2.getPropertyValue("padding-left")), o = parseInt(r2.getPropertyValue("padding-top"));
        return [t4.clientX - s2.left - n2, t4.clientY - s2.top - o];
      }
      Object.defineProperty(t3, "__esModule", { value: true }), t3.getCoords = t3.getCoordsRelativeToElement = void 0, t3.getCoordsRelativeToElement = i2, t3.getCoords = function(e3, t4, s2, r2, n2, o, a, h, c) {
        if (!o) return;
        const l2 = i2(e3, t4, s2);
        return l2 ? (l2[0] = Math.ceil((l2[0] + (c ? a / 2 : 0)) / a), l2[1] = Math.ceil(l2[1] / h), l2[0] = Math.min(Math.max(l2[0], 1), r2 + (c ? 1 : 0)), l2[1] = Math.min(Math.max(l2[1], 1), n2), l2) : void 0;
      };
    }, 9504: (e2, t3, i2) => {
      Object.defineProperty(t3, "__esModule", { value: true }), t3.moveToCellSequence = void 0;
      const s2 = i2(2584);
      function r2(e3, t4, i3, s3) {
        const r3 = e3 - n2(e3, i3), a2 = t4 - n2(t4, i3), l2 = Math.abs(r3 - a2) - function(e4, t5, i4) {
          let s4 = 0;
          const r4 = e4 - n2(e4, i4), a3 = t5 - n2(t5, i4);
          for (let n3 = 0; n3 < Math.abs(r4 - a3); n3++) {
            const a4 = "A" === o(e4, t5) ? -1 : 1, h2 = i4.buffer.lines.get(r4 + a4 * n3);
            h2?.isWrapped && s4++;
          }
          return s4;
        }(e3, t4, i3);
        return c(l2, h(o(e3, t4), s3));
      }
      function n2(e3, t4) {
        let i3 = 0, s3 = t4.buffer.lines.get(e3), r3 = s3?.isWrapped;
        for (; r3 && e3 >= 0 && e3 < t4.rows; ) i3++, s3 = t4.buffer.lines.get(--e3), r3 = s3?.isWrapped;
        return i3;
      }
      function o(e3, t4) {
        return e3 > t4 ? "A" : "B";
      }
      function a(e3, t4, i3, s3, r3, n3) {
        let o2 = e3, a2 = t4, h2 = "";
        for (; o2 !== i3 || a2 !== s3; ) o2 += r3 ? 1 : -1, r3 && o2 > n3.cols - 1 ? (h2 += n3.buffer.translateBufferLineToString(a2, false, e3, o2), o2 = 0, e3 = 0, a2++) : !r3 && o2 < 0 && (h2 += n3.buffer.translateBufferLineToString(a2, false, 0, e3 + 1), o2 = n3.cols - 1, e3 = o2, a2--);
        return h2 + n3.buffer.translateBufferLineToString(a2, false, e3, o2);
      }
      function h(e3, t4) {
        const i3 = t4 ? "O" : "[";
        return s2.C0.ESC + i3 + e3;
      }
      function c(e3, t4) {
        e3 = Math.floor(e3);
        let i3 = "";
        for (let s3 = 0; s3 < e3; s3++) i3 += t4;
        return i3;
      }
      t3.moveToCellSequence = function(e3, t4, i3, s3) {
        const o2 = i3.buffer.x, l2 = i3.buffer.y;
        if (!i3.buffer.hasScrollback) return function(e4, t5, i4, s4, o3, l3) {
          return 0 === r2(t5, s4, o3, l3).length ? "" : c(a(e4, t5, e4, t5 - n2(t5, o3), false, o3).length, h("D", l3));
        }(o2, l2, 0, t4, i3, s3) + r2(l2, t4, i3, s3) + function(e4, t5, i4, s4, o3, l3) {
          let d2;
          d2 = r2(t5, s4, o3, l3).length > 0 ? s4 - n2(s4, o3) : t5;
          const _2 = s4, u2 = function(e5, t6, i5, s5, o4, a2) {
            let h2;
            return h2 = r2(i5, s5, o4, a2).length > 0 ? s5 - n2(s5, o4) : t6, e5 < i5 && h2 <= s5 || e5 >= i5 && h2 < s5 ? "C" : "D";
          }(e4, t5, i4, s4, o3, l3);
          return c(a(e4, d2, i4, _2, "C" === u2, o3).length, h(u2, l3));
        }(o2, l2, e3, t4, i3, s3);
        let d;
        if (l2 === t4) return d = o2 > e3 ? "D" : "C", c(Math.abs(o2 - e3), h(d, s3));
        d = l2 > t4 ? "D" : "C";
        const _ = Math.abs(l2 - t4);
        return c(function(e4, t5) {
          return t5.cols - e4;
        }(l2 > t4 ? e3 : o2, i3) + (_ - 1) * i3.cols + 1 + ((l2 > t4 ? o2 : e3) - 1), h(d, s3));
      };
    }, 1296: function(e2, t3, i2) {
      var s2 = this && this.__decorate || function(e3, t4, i3, s3) {
        var r3, n3 = arguments.length, o2 = n3 < 3 ? t4 : null === s3 ? s3 = Object.getOwnPropertyDescriptor(t4, i3) : s3;
        if ("object" == typeof Reflect && "function" == typeof Reflect.decorate) o2 = Reflect.decorate(e3, t4, i3, s3);
        else for (var a2 = e3.length - 1; a2 >= 0; a2--) (r3 = e3[a2]) && (o2 = (n3 < 3 ? r3(o2) : n3 > 3 ? r3(t4, i3, o2) : r3(t4, i3)) || o2);
        return n3 > 3 && o2 && Object.defineProperty(t4, i3, o2), o2;
      }, r2 = this && this.__param || function(e3, t4) {
        return function(i3, s3) {
          t4(i3, s3, e3);
        };
      };
      Object.defineProperty(t3, "__esModule", { value: true }), t3.DomRenderer = void 0;
      const n2 = i2(3787), o = i2(2550), a = i2(2223), h = i2(6171), c = i2(6052), l2 = i2(4725), d = i2(8055), _ = i2(8460), u2 = i2(844), f2 = i2(2585), v2 = "xterm-dom-renderer-owner-", p2 = "xterm-rows", g = "xterm-fg-", m2 = "xterm-bg-", S2 = "xterm-focus", C2 = "xterm-selection";
      let b = 1, w2 = t3.DomRenderer = class extends u2.Disposable {
        constructor(e3, t4, i3, s3, r3, a2, l3, d2, f3, g2, m3, S3, w3) {
          super(), this._terminal = e3, this._document = t4, this._element = i3, this._screenElement = s3, this._viewportElement = r3, this._helperContainer = a2, this._linkifier2 = l3, this._charSizeService = f3, this._optionsService = g2, this._bufferService = m3, this._coreBrowserService = S3, this._themeService = w3, this._terminalClass = b++, this._rowElements = [], this._selectionRenderModel = (0, c.createSelectionRenderModel)(), this.onRequestRedraw = this.register(new _.EventEmitter()).event, this._rowContainer = this._document.createElement("div"), this._rowContainer.classList.add(p2), this._rowContainer.style.lineHeight = "normal", this._rowContainer.setAttribute("aria-hidden", "true"), this._refreshRowElements(this._bufferService.cols, this._bufferService.rows), this._selectionContainer = this._document.createElement("div"), this._selectionContainer.classList.add(C2), this._selectionContainer.setAttribute("aria-hidden", "true"), this.dimensions = (0, h.createRenderDimensions)(), this._updateDimensions(), this.register(this._optionsService.onOptionChange(() => this._handleOptionsChanged())), this.register(this._themeService.onChangeColors((e4) => this._injectCss(e4))), this._injectCss(this._themeService.colors), this._rowFactory = d2.createInstance(n2.DomRendererRowFactory, document), this._element.classList.add(v2 + this._terminalClass), this._screenElement.appendChild(this._rowContainer), this._screenElement.appendChild(this._selectionContainer), this.register(this._linkifier2.onShowLinkUnderline((e4) => this._handleLinkHover(e4))), this.register(this._linkifier2.onHideLinkUnderline((e4) => this._handleLinkLeave(e4))), this.register((0, u2.toDisposable)(() => {
            this._element.classList.remove(v2 + this._terminalClass), this._rowContainer.remove(), this._selectionContainer.remove(), this._widthCache.dispose(), this._themeStyleElement.remove(), this._dimensionsStyleElement.remove();
          })), this._widthCache = new o.WidthCache(this._document, this._helperContainer), this._widthCache.setFont(this._optionsService.rawOptions.fontFamily, this._optionsService.rawOptions.fontSize, this._optionsService.rawOptions.fontWeight, this._optionsService.rawOptions.fontWeightBold), this._setDefaultSpacing();
        }
        _updateDimensions() {
          const e3 = this._coreBrowserService.dpr;
          this.dimensions.device.char.width = this._charSizeService.width * e3, this.dimensions.device.char.height = Math.ceil(this._charSizeService.height * e3), this.dimensions.device.cell.width = this.dimensions.device.char.width + Math.round(this._optionsService.rawOptions.letterSpacing), this.dimensions.device.cell.height = Math.floor(this.dimensions.device.char.height * this._optionsService.rawOptions.lineHeight), this.dimensions.device.char.left = 0, this.dimensions.device.char.top = 0, this.dimensions.device.canvas.width = this.dimensions.device.cell.width * this._bufferService.cols, this.dimensions.device.canvas.height = this.dimensions.device.cell.height * this._bufferService.rows, this.dimensions.css.canvas.width = Math.round(this.dimensions.device.canvas.width / e3), this.dimensions.css.canvas.height = Math.round(this.dimensions.device.canvas.height / e3), this.dimensions.css.cell.width = this.dimensions.css.canvas.width / this._bufferService.cols, this.dimensions.css.cell.height = this.dimensions.css.canvas.height / this._bufferService.rows;
          for (const e4 of this._rowElements) e4.style.width = `${this.dimensions.css.canvas.width}px`, e4.style.height = `${this.dimensions.css.cell.height}px`, e4.style.lineHeight = `${this.dimensions.css.cell.height}px`, e4.style.overflow = "hidden";
          this._dimensionsStyleElement || (this._dimensionsStyleElement = this._document.createElement("style"), this._screenElement.appendChild(this._dimensionsStyleElement));
          const t4 = `${this._terminalSelector} .${p2} span { display: inline-block; height: 100%; vertical-align: top;}`;
          this._dimensionsStyleElement.textContent = t4, this._selectionContainer.style.height = this._viewportElement.style.height, this._screenElement.style.width = `${this.dimensions.css.canvas.width}px`, this._screenElement.style.height = `${this.dimensions.css.canvas.height}px`;
        }
        _injectCss(e3) {
          this._themeStyleElement || (this._themeStyleElement = this._document.createElement("style"), this._screenElement.appendChild(this._themeStyleElement));
          let t4 = `${this._terminalSelector} .${p2} { color: ${e3.foreground.css}; font-family: ${this._optionsService.rawOptions.fontFamily}; font-size: ${this._optionsService.rawOptions.fontSize}px; font-kerning: none; white-space: pre}`;
          t4 += `${this._terminalSelector} .${p2} .xterm-dim { color: ${d.color.multiplyOpacity(e3.foreground, 0.5).css};}`, t4 += `${this._terminalSelector} span:not(.xterm-bold) { font-weight: ${this._optionsService.rawOptions.fontWeight};}${this._terminalSelector} span.xterm-bold { font-weight: ${this._optionsService.rawOptions.fontWeightBold};}${this._terminalSelector} span.xterm-italic { font-style: italic;}`;
          const i3 = `blink_underline_${this._terminalClass}`, s3 = `blink_bar_${this._terminalClass}`, r3 = `blink_block_${this._terminalClass}`;
          t4 += `@keyframes ${i3} { 50% {  border-bottom-style: hidden; }}`, t4 += `@keyframes ${s3} { 50% {  box-shadow: none; }}`, t4 += `@keyframes ${r3} { 0% {  background-color: ${e3.cursor.css};  color: ${e3.cursorAccent.css}; } 50% {  background-color: inherit;  color: ${e3.cursor.css}; }}`, t4 += `${this._terminalSelector} .${p2}.${S2} .xterm-cursor.xterm-cursor-blink.xterm-cursor-underline { animation: ${i3} 1s step-end infinite;}${this._terminalSelector} .${p2}.${S2} .xterm-cursor.xterm-cursor-blink.xterm-cursor-bar { animation: ${s3} 1s step-end infinite;}${this._terminalSelector} .${p2}.${S2} .xterm-cursor.xterm-cursor-blink.xterm-cursor-block { animation: ${r3} 1s step-end infinite;}${this._terminalSelector} .${p2} .xterm-cursor.xterm-cursor-block { background-color: ${e3.cursor.css}; color: ${e3.cursorAccent.css};}${this._terminalSelector} .${p2} .xterm-cursor.xterm-cursor-block:not(.xterm-cursor-blink) { background-color: ${e3.cursor.css} !important; color: ${e3.cursorAccent.css} !important;}${this._terminalSelector} .${p2} .xterm-cursor.xterm-cursor-outline { outline: 1px solid ${e3.cursor.css}; outline-offset: -1px;}${this._terminalSelector} .${p2} .xterm-cursor.xterm-cursor-bar { box-shadow: ${this._optionsService.rawOptions.cursorWidth}px 0 0 ${e3.cursor.css} inset;}${this._terminalSelector} .${p2} .xterm-cursor.xterm-cursor-underline { border-bottom: 1px ${e3.cursor.css}; border-bottom-style: solid; height: calc(100% - 1px);}`, t4 += `${this._terminalSelector} .${C2} { position: absolute; top: 0; left: 0; z-index: 1; pointer-events: none;}${this._terminalSelector}.focus .${C2} div { position: absolute; background-color: ${e3.selectionBackgroundOpaque.css};}${this._terminalSelector} .${C2} div { position: absolute; background-color: ${e3.selectionInactiveBackgroundOpaque.css};}`;
          for (const [i4, s4] of e3.ansi.entries()) t4 += `${this._terminalSelector} .${g}${i4} { color: ${s4.css}; }${this._terminalSelector} .${g}${i4}.xterm-dim { color: ${d.color.multiplyOpacity(s4, 0.5).css}; }${this._terminalSelector} .${m2}${i4} { background-color: ${s4.css}; }`;
          t4 += `${this._terminalSelector} .${g}${a.INVERTED_DEFAULT_COLOR} { color: ${d.color.opaque(e3.background).css}; }${this._terminalSelector} .${g}${a.INVERTED_DEFAULT_COLOR}.xterm-dim { color: ${d.color.multiplyOpacity(d.color.opaque(e3.background), 0.5).css}; }${this._terminalSelector} .${m2}${a.INVERTED_DEFAULT_COLOR} { background-color: ${e3.foreground.css}; }`, this._themeStyleElement.textContent = t4;
        }
        _setDefaultSpacing() {
          const e3 = this.dimensions.css.cell.width - this._widthCache.get("W", false, false);
          this._rowContainer.style.letterSpacing = `${e3}px`, this._rowFactory.defaultSpacing = e3;
        }
        handleDevicePixelRatioChange() {
          this._updateDimensions(), this._widthCache.clear(), this._setDefaultSpacing();
        }
        _refreshRowElements(e3, t4) {
          for (let e4 = this._rowElements.length; e4 <= t4; e4++) {
            const e5 = this._document.createElement("div");
            this._rowContainer.appendChild(e5), this._rowElements.push(e5);
          }
          for (; this._rowElements.length > t4; ) this._rowContainer.removeChild(this._rowElements.pop());
        }
        handleResize(e3, t4) {
          this._refreshRowElements(e3, t4), this._updateDimensions(), this.handleSelectionChanged(this._selectionRenderModel.selectionStart, this._selectionRenderModel.selectionEnd, this._selectionRenderModel.columnSelectMode);
        }
        handleCharSizeChanged() {
          this._updateDimensions(), this._widthCache.clear(), this._setDefaultSpacing();
        }
        handleBlur() {
          this._rowContainer.classList.remove(S2), this.renderRows(0, this._bufferService.rows - 1);
        }
        handleFocus() {
          this._rowContainer.classList.add(S2), this.renderRows(this._bufferService.buffer.y, this._bufferService.buffer.y);
        }
        handleSelectionChanged(e3, t4, i3) {
          if (this._selectionContainer.replaceChildren(), this._rowFactory.handleSelectionChanged(e3, t4, i3), this.renderRows(0, this._bufferService.rows - 1), !e3 || !t4) return;
          this._selectionRenderModel.update(this._terminal, e3, t4, i3);
          const s3 = this._selectionRenderModel.viewportStartRow, r3 = this._selectionRenderModel.viewportEndRow, n3 = this._selectionRenderModel.viewportCappedStartRow, o2 = this._selectionRenderModel.viewportCappedEndRow;
          if (n3 >= this._bufferService.rows || o2 < 0) return;
          const a2 = this._document.createDocumentFragment();
          if (i3) {
            const i4 = e3[0] > t4[0];
            a2.appendChild(this._createSelectionElement(n3, i4 ? t4[0] : e3[0], i4 ? e3[0] : t4[0], o2 - n3 + 1));
          } else {
            const i4 = s3 === n3 ? e3[0] : 0, h2 = n3 === r3 ? t4[0] : this._bufferService.cols;
            a2.appendChild(this._createSelectionElement(n3, i4, h2));
            const c2 = o2 - n3 - 1;
            if (a2.appendChild(this._createSelectionElement(n3 + 1, 0, this._bufferService.cols, c2)), n3 !== o2) {
              const e4 = r3 === o2 ? t4[0] : this._bufferService.cols;
              a2.appendChild(this._createSelectionElement(o2, 0, e4));
            }
          }
          this._selectionContainer.appendChild(a2);
        }
        _createSelectionElement(e3, t4, i3, s3 = 1) {
          const r3 = this._document.createElement("div"), n3 = t4 * this.dimensions.css.cell.width;
          let o2 = this.dimensions.css.cell.width * (i3 - t4);
          return n3 + o2 > this.dimensions.css.canvas.width && (o2 = this.dimensions.css.canvas.width - n3), r3.style.height = s3 * this.dimensions.css.cell.height + "px", r3.style.top = e3 * this.dimensions.css.cell.height + "px", r3.style.left = `${n3}px`, r3.style.width = `${o2}px`, r3;
        }
        handleCursorMove() {
        }
        _handleOptionsChanged() {
          this._updateDimensions(), this._injectCss(this._themeService.colors), this._widthCache.setFont(this._optionsService.rawOptions.fontFamily, this._optionsService.rawOptions.fontSize, this._optionsService.rawOptions.fontWeight, this._optionsService.rawOptions.fontWeightBold), this._setDefaultSpacing();
        }
        clear() {
          for (const e3 of this._rowElements) e3.replaceChildren();
        }
        renderRows(e3, t4) {
          const i3 = this._bufferService.buffer, s3 = i3.ybase + i3.y, r3 = Math.min(i3.x, this._bufferService.cols - 1), n3 = this._optionsService.rawOptions.cursorBlink, o2 = this._optionsService.rawOptions.cursorStyle, a2 = this._optionsService.rawOptions.cursorInactiveStyle;
          for (let h2 = e3; h2 <= t4; h2++) {
            const e4 = h2 + i3.ydisp, t5 = this._rowElements[h2], c2 = i3.lines.get(e4);
            if (!t5 || !c2) break;
            t5.replaceChildren(...this._rowFactory.createRow(c2, e4, e4 === s3, o2, a2, r3, n3, this.dimensions.css.cell.width, this._widthCache, -1, -1));
          }
        }
        get _terminalSelector() {
          return `.${v2}${this._terminalClass}`;
        }
        _handleLinkHover(e3) {
          this._setCellUnderline(e3.x1, e3.x2, e3.y1, e3.y2, e3.cols, true);
        }
        _handleLinkLeave(e3) {
          this._setCellUnderline(e3.x1, e3.x2, e3.y1, e3.y2, e3.cols, false);
        }
        _setCellUnderline(e3, t4, i3, s3, r3, n3) {
          i3 < 0 && (e3 = 0), s3 < 0 && (t4 = 0);
          const o2 = this._bufferService.rows - 1;
          i3 = Math.max(Math.min(i3, o2), 0), s3 = Math.max(Math.min(s3, o2), 0), r3 = Math.min(r3, this._bufferService.cols);
          const a2 = this._bufferService.buffer, h2 = a2.ybase + a2.y, c2 = Math.min(a2.x, r3 - 1), l3 = this._optionsService.rawOptions.cursorBlink, d2 = this._optionsService.rawOptions.cursorStyle, _2 = this._optionsService.rawOptions.cursorInactiveStyle;
          for (let o3 = i3; o3 <= s3; ++o3) {
            const u3 = o3 + a2.ydisp, f3 = this._rowElements[o3], v3 = a2.lines.get(u3);
            if (!f3 || !v3) break;
            f3.replaceChildren(...this._rowFactory.createRow(v3, u3, u3 === h2, d2, _2, c2, l3, this.dimensions.css.cell.width, this._widthCache, n3 ? o3 === i3 ? e3 : 0 : -1, n3 ? (o3 === s3 ? t4 : r3) - 1 : -1));
          }
        }
      };
      t3.DomRenderer = w2 = s2([r2(7, f2.IInstantiationService), r2(8, l2.ICharSizeService), r2(9, f2.IOptionsService), r2(10, f2.IBufferService), r2(11, l2.ICoreBrowserService), r2(12, l2.IThemeService)], w2);
    }, 3787: function(e2, t3, i2) {
      var s2 = this && this.__decorate || function(e3, t4, i3, s3) {
        var r3, n3 = arguments.length, o2 = n3 < 3 ? t4 : null === s3 ? s3 = Object.getOwnPropertyDescriptor(t4, i3) : s3;
        if ("object" == typeof Reflect && "function" == typeof Reflect.decorate) o2 = Reflect.decorate(e3, t4, i3, s3);
        else for (var a2 = e3.length - 1; a2 >= 0; a2--) (r3 = e3[a2]) && (o2 = (n3 < 3 ? r3(o2) : n3 > 3 ? r3(t4, i3, o2) : r3(t4, i3)) || o2);
        return n3 > 3 && o2 && Object.defineProperty(t4, i3, o2), o2;
      }, r2 = this && this.__param || function(e3, t4) {
        return function(i3, s3) {
          t4(i3, s3, e3);
        };
      };
      Object.defineProperty(t3, "__esModule", { value: true }), t3.DomRendererRowFactory = void 0;
      const n2 = i2(2223), o = i2(643), a = i2(511), h = i2(2585), c = i2(8055), l2 = i2(4725), d = i2(4269), _ = i2(6171), u2 = i2(3734);
      let f2 = t3.DomRendererRowFactory = class {
        constructor(e3, t4, i3, s3, r3, n3, o2) {
          this._document = e3, this._characterJoinerService = t4, this._optionsService = i3, this._coreBrowserService = s3, this._coreService = r3, this._decorationService = n3, this._themeService = o2, this._workCell = new a.CellData(), this._columnSelectMode = false, this.defaultSpacing = 0;
        }
        handleSelectionChanged(e3, t4, i3) {
          this._selectionStart = e3, this._selectionEnd = t4, this._columnSelectMode = i3;
        }
        createRow(e3, t4, i3, s3, r3, a2, h2, l3, _2, f3, p2) {
          const g = [], m2 = this._characterJoinerService.getJoinedCharacters(t4), S2 = this._themeService.colors;
          let C2, b = e3.getNoBgTrimmedLength();
          i3 && b < a2 + 1 && (b = a2 + 1);
          let w2 = 0, y2 = "", E2 = 0, k2 = 0, L2 = 0, D2 = false, R2 = 0, x2 = false, A2 = 0;
          const B2 = [], T2 = -1 !== f3 && -1 !== p2;
          for (let M2 = 0; M2 < b; M2++) {
            e3.loadCell(M2, this._workCell);
            let b2 = this._workCell.getWidth();
            if (0 === b2) continue;
            let O2 = false, P2 = M2, I2 = this._workCell;
            if (m2.length > 0 && M2 === m2[0][0]) {
              O2 = true;
              const t5 = m2.shift();
              I2 = new d.JoinedCellData(this._workCell, e3.translateToString(true, t5[0], t5[1]), t5[1] - t5[0]), P2 = t5[1] - 1, b2 = I2.getWidth();
            }
            const H2 = this._isCellInSelection(M2, t4), F2 = i3 && M2 === a2, W2 = T2 && M2 >= f3 && M2 <= p2;
            let U2 = false;
            this._decorationService.forEachDecorationAtCell(M2, t4, void 0, (e4) => {
              U2 = true;
            });
            let N2 = I2.getChars() || o.WHITESPACE_CELL_CHAR;
            if (" " === N2 && (I2.isUnderline() || I2.isOverline()) && (N2 = " "), A2 = b2 * l3 - _2.get(N2, I2.isBold(), I2.isItalic()), C2) {
              if (w2 && (H2 && x2 || !H2 && !x2 && I2.bg === E2) && (H2 && x2 && S2.selectionForeground || I2.fg === k2) && I2.extended.ext === L2 && W2 === D2 && A2 === R2 && !F2 && !O2 && !U2) {
                I2.isInvisible() ? y2 += o.WHITESPACE_CELL_CHAR : y2 += N2, w2++;
                continue;
              }
              w2 && (C2.textContent = y2), C2 = this._document.createElement("span"), w2 = 0, y2 = "";
            } else C2 = this._document.createElement("span");
            if (E2 = I2.bg, k2 = I2.fg, L2 = I2.extended.ext, D2 = W2, R2 = A2, x2 = H2, O2 && a2 >= M2 && a2 <= P2 && (a2 = M2), !this._coreService.isCursorHidden && F2 && this._coreService.isCursorInitialized) {
              if (B2.push("xterm-cursor"), this._coreBrowserService.isFocused) h2 && B2.push("xterm-cursor-blink"), B2.push("bar" === s3 ? "xterm-cursor-bar" : "underline" === s3 ? "xterm-cursor-underline" : "xterm-cursor-block");
              else if (r3) switch (r3) {
                case "outline":
                  B2.push("xterm-cursor-outline");
                  break;
                case "block":
                  B2.push("xterm-cursor-block");
                  break;
                case "bar":
                  B2.push("xterm-cursor-bar");
                  break;
                case "underline":
                  B2.push("xterm-cursor-underline");
              }
            }
            if (I2.isBold() && B2.push("xterm-bold"), I2.isItalic() && B2.push("xterm-italic"), I2.isDim() && B2.push("xterm-dim"), y2 = I2.isInvisible() ? o.WHITESPACE_CELL_CHAR : I2.getChars() || o.WHITESPACE_CELL_CHAR, I2.isUnderline() && (B2.push(`xterm-underline-${I2.extended.underlineStyle}`), " " === y2 && (y2 = " "), !I2.isUnderlineColorDefault())) if (I2.isUnderlineColorRGB()) C2.style.textDecorationColor = `rgb(${u2.AttributeData.toColorRGB(I2.getUnderlineColor()).join(",")})`;
            else {
              let e4 = I2.getUnderlineColor();
              this._optionsService.rawOptions.drawBoldTextInBrightColors && I2.isBold() && e4 < 8 && (e4 += 8), C2.style.textDecorationColor = S2.ansi[e4].css;
            }
            I2.isOverline() && (B2.push("xterm-overline"), " " === y2 && (y2 = " ")), I2.isStrikethrough() && B2.push("xterm-strikethrough"), W2 && (C2.style.textDecoration = "underline");
            let $ = I2.getFgColor(), j = I2.getFgColorMode(), z2 = I2.getBgColor(), K2 = I2.getBgColorMode();
            const q2 = !!I2.isInverse();
            if (q2) {
              const e4 = $;
              $ = z2, z2 = e4;
              const t5 = j;
              j = K2, K2 = t5;
            }
            let V2, G2, X2, J2 = false;
            switch (this._decorationService.forEachDecorationAtCell(M2, t4, void 0, (e4) => {
              "top" !== e4.options.layer && J2 || (e4.backgroundColorRGB && (K2 = 50331648, z2 = e4.backgroundColorRGB.rgba >> 8 & 16777215, V2 = e4.backgroundColorRGB), e4.foregroundColorRGB && (j = 50331648, $ = e4.foregroundColorRGB.rgba >> 8 & 16777215, G2 = e4.foregroundColorRGB), J2 = "top" === e4.options.layer);
            }), !J2 && H2 && (V2 = this._coreBrowserService.isFocused ? S2.selectionBackgroundOpaque : S2.selectionInactiveBackgroundOpaque, z2 = V2.rgba >> 8 & 16777215, K2 = 50331648, J2 = true, S2.selectionForeground && (j = 50331648, $ = S2.selectionForeground.rgba >> 8 & 16777215, G2 = S2.selectionForeground)), J2 && B2.push("xterm-decoration-top"), K2) {
              case 16777216:
              case 33554432:
                X2 = S2.ansi[z2], B2.push(`xterm-bg-${z2}`);
                break;
              case 50331648:
                X2 = c.channels.toColor(z2 >> 16, z2 >> 8 & 255, 255 & z2), this._addStyle(C2, `background-color:#${v2((z2 >>> 0).toString(16), "0", 6)}`);
                break;
              default:
                q2 ? (X2 = S2.foreground, B2.push(`xterm-bg-${n2.INVERTED_DEFAULT_COLOR}`)) : X2 = S2.background;
            }
            switch (V2 || I2.isDim() && (V2 = c.color.multiplyOpacity(X2, 0.5)), j) {
              case 16777216:
              case 33554432:
                I2.isBold() && $ < 8 && this._optionsService.rawOptions.drawBoldTextInBrightColors && ($ += 8), this._applyMinimumContrast(C2, X2, S2.ansi[$], I2, V2, void 0) || B2.push(`xterm-fg-${$}`);
                break;
              case 50331648:
                const e4 = c.channels.toColor($ >> 16 & 255, $ >> 8 & 255, 255 & $);
                this._applyMinimumContrast(C2, X2, e4, I2, V2, G2) || this._addStyle(C2, `color:#${v2($.toString(16), "0", 6)}`);
                break;
              default:
                this._applyMinimumContrast(C2, X2, S2.foreground, I2, V2, G2) || q2 && B2.push(`xterm-fg-${n2.INVERTED_DEFAULT_COLOR}`);
            }
            B2.length && (C2.className = B2.join(" "), B2.length = 0), F2 || O2 || U2 ? C2.textContent = y2 : w2++, A2 !== this.defaultSpacing && (C2.style.letterSpacing = `${A2}px`), g.push(C2), M2 = P2;
          }
          return C2 && w2 && (C2.textContent = y2), g;
        }
        _applyMinimumContrast(e3, t4, i3, s3, r3, n3) {
          if (1 === this._optionsService.rawOptions.minimumContrastRatio || (0, _.treatGlyphAsBackgroundColor)(s3.getCode())) return false;
          const o2 = this._getContrastCache(s3);
          let a2;
          if (r3 || n3 || (a2 = o2.getColor(t4.rgba, i3.rgba)), void 0 === a2) {
            const e4 = this._optionsService.rawOptions.minimumContrastRatio / (s3.isDim() ? 2 : 1);
            a2 = c.color.ensureContrastRatio(r3 || t4, n3 || i3, e4), o2.setColor((r3 || t4).rgba, (n3 || i3).rgba, a2 ?? null);
          }
          return !!a2 && (this._addStyle(e3, `color:${a2.css}`), true);
        }
        _getContrastCache(e3) {
          return e3.isDim() ? this._themeService.colors.halfContrastCache : this._themeService.colors.contrastCache;
        }
        _addStyle(e3, t4) {
          e3.setAttribute("style", `${e3.getAttribute("style") || ""}${t4};`);
        }
        _isCellInSelection(e3, t4) {
          const i3 = this._selectionStart, s3 = this._selectionEnd;
          return !(!i3 || !s3) && (this._columnSelectMode ? i3[0] <= s3[0] ? e3 >= i3[0] && t4 >= i3[1] && e3 < s3[0] && t4 <= s3[1] : e3 < i3[0] && t4 >= i3[1] && e3 >= s3[0] && t4 <= s3[1] : t4 > i3[1] && t4 < s3[1] || i3[1] === s3[1] && t4 === i3[1] && e3 >= i3[0] && e3 < s3[0] || i3[1] < s3[1] && t4 === s3[1] && e3 < s3[0] || i3[1] < s3[1] && t4 === i3[1] && e3 >= i3[0]);
        }
      };
      function v2(e3, t4, i3) {
        for (; e3.length < i3; ) e3 = t4 + e3;
        return e3;
      }
      t3.DomRendererRowFactory = f2 = s2([r2(1, l2.ICharacterJoinerService), r2(2, h.IOptionsService), r2(3, l2.ICoreBrowserService), r2(4, h.ICoreService), r2(5, h.IDecorationService), r2(6, l2.IThemeService)], f2);
    }, 2550: (e2, t3) => {
      Object.defineProperty(t3, "__esModule", { value: true }), t3.WidthCache = void 0, t3.WidthCache = class {
        constructor(e3, t4) {
          this._flat = new Float32Array(256), this._font = "", this._fontSize = 0, this._weight = "normal", this._weightBold = "bold", this._measureElements = [], this._container = e3.createElement("div"), this._container.classList.add("xterm-width-cache-measure-container"), this._container.setAttribute("aria-hidden", "true"), this._container.style.whiteSpace = "pre", this._container.style.fontKerning = "none";
          const i2 = e3.createElement("span");
          i2.classList.add("xterm-char-measure-element");
          const s2 = e3.createElement("span");
          s2.classList.add("xterm-char-measure-element"), s2.style.fontWeight = "bold";
          const r2 = e3.createElement("span");
          r2.classList.add("xterm-char-measure-element"), r2.style.fontStyle = "italic";
          const n2 = e3.createElement("span");
          n2.classList.add("xterm-char-measure-element"), n2.style.fontWeight = "bold", n2.style.fontStyle = "italic", this._measureElements = [i2, s2, r2, n2], this._container.appendChild(i2), this._container.appendChild(s2), this._container.appendChild(r2), this._container.appendChild(n2), t4.appendChild(this._container), this.clear();
        }
        dispose() {
          this._container.remove(), this._measureElements.length = 0, this._holey = void 0;
        }
        clear() {
          this._flat.fill(-9999), this._holey = /* @__PURE__ */ new Map();
        }
        setFont(e3, t4, i2, s2) {
          e3 === this._font && t4 === this._fontSize && i2 === this._weight && s2 === this._weightBold || (this._font = e3, this._fontSize = t4, this._weight = i2, this._weightBold = s2, this._container.style.fontFamily = this._font, this._container.style.fontSize = `${this._fontSize}px`, this._measureElements[0].style.fontWeight = `${i2}`, this._measureElements[1].style.fontWeight = `${s2}`, this._measureElements[2].style.fontWeight = `${i2}`, this._measureElements[3].style.fontWeight = `${s2}`, this.clear());
        }
        get(e3, t4, i2) {
          let s2 = 0;
          if (!t4 && !i2 && 1 === e3.length && (s2 = e3.charCodeAt(0)) < 256) {
            if (-9999 !== this._flat[s2]) return this._flat[s2];
            const t5 = this._measure(e3, 0);
            return t5 > 0 && (this._flat[s2] = t5), t5;
          }
          let r2 = e3;
          t4 && (r2 += "B"), i2 && (r2 += "I");
          let n2 = this._holey.get(r2);
          if (void 0 === n2) {
            let s3 = 0;
            t4 && (s3 |= 1), i2 && (s3 |= 2), n2 = this._measure(e3, s3), n2 > 0 && this._holey.set(r2, n2);
          }
          return n2;
        }
        _measure(e3, t4) {
          const i2 = this._measureElements[t4];
          return i2.textContent = e3.repeat(32), i2.offsetWidth / 32;
        }
      };
    }, 2223: (e2, t3, i2) => {
      Object.defineProperty(t3, "__esModule", { value: true }), t3.TEXT_BASELINE = t3.DIM_OPACITY = t3.INVERTED_DEFAULT_COLOR = void 0;
      const s2 = i2(6114);
      t3.INVERTED_DEFAULT_COLOR = 257, t3.DIM_OPACITY = 0.5, t3.TEXT_BASELINE = s2.isFirefox || s2.isLegacyEdge ? "bottom" : "ideographic";
    }, 6171: (e2, t3) => {
      function i2(e3) {
        return 57508 <= e3 && e3 <= 57558;
      }
      function s2(e3) {
        return e3 >= 128512 && e3 <= 128591 || e3 >= 127744 && e3 <= 128511 || e3 >= 128640 && e3 <= 128767 || e3 >= 9728 && e3 <= 9983 || e3 >= 9984 && e3 <= 10175 || e3 >= 65024 && e3 <= 65039 || e3 >= 129280 && e3 <= 129535 || e3 >= 127462 && e3 <= 127487;
      }
      Object.defineProperty(t3, "__esModule", { value: true }), t3.computeNextVariantOffset = t3.createRenderDimensions = t3.treatGlyphAsBackgroundColor = t3.allowRescaling = t3.isEmoji = t3.isRestrictedPowerlineGlyph = t3.isPowerlineGlyph = t3.throwIfFalsy = void 0, t3.throwIfFalsy = function(e3) {
        if (!e3) throw new Error("value must not be falsy");
        return e3;
      }, t3.isPowerlineGlyph = i2, t3.isRestrictedPowerlineGlyph = function(e3) {
        return 57520 <= e3 && e3 <= 57527;
      }, t3.isEmoji = s2, t3.allowRescaling = function(e3, t4, r2, n2) {
        return 1 === t4 && r2 > Math.ceil(1.5 * n2) && void 0 !== e3 && e3 > 255 && !s2(e3) && !i2(e3) && !function(e4) {
          return 57344 <= e4 && e4 <= 63743;
        }(e3);
      }, t3.treatGlyphAsBackgroundColor = function(e3) {
        return i2(e3) || function(e4) {
          return 9472 <= e4 && e4 <= 9631;
        }(e3);
      }, t3.createRenderDimensions = function() {
        return { css: { canvas: { width: 0, height: 0 }, cell: { width: 0, height: 0 } }, device: { canvas: { width: 0, height: 0 }, cell: { width: 0, height: 0 }, char: { width: 0, height: 0, left: 0, top: 0 } } };
      }, t3.computeNextVariantOffset = function(e3, t4, i3 = 0) {
        return (e3 - (2 * Math.round(t4) - i3)) % (2 * Math.round(t4));
      };
    }, 6052: (e2, t3) => {
      Object.defineProperty(t3, "__esModule", { value: true }), t3.createSelectionRenderModel = void 0;
      class i2 {
        constructor() {
          this.clear();
        }
        clear() {
          this.hasSelection = false, this.columnSelectMode = false, this.viewportStartRow = 0, this.viewportEndRow = 0, this.viewportCappedStartRow = 0, this.viewportCappedEndRow = 0, this.startCol = 0, this.endCol = 0, this.selectionStart = void 0, this.selectionEnd = void 0;
        }
        update(e3, t4, i3, s2 = false) {
          if (this.selectionStart = t4, this.selectionEnd = i3, !t4 || !i3 || t4[0] === i3[0] && t4[1] === i3[1]) return void this.clear();
          const r2 = e3.buffers.active.ydisp, n2 = t4[1] - r2, o = i3[1] - r2, a = Math.max(n2, 0), h = Math.min(o, e3.rows - 1);
          a >= e3.rows || h < 0 ? this.clear() : (this.hasSelection = true, this.columnSelectMode = s2, this.viewportStartRow = n2, this.viewportEndRow = o, this.viewportCappedStartRow = a, this.viewportCappedEndRow = h, this.startCol = t4[0], this.endCol = i3[0]);
        }
        isCellSelected(e3, t4, i3) {
          return !!this.hasSelection && (i3 -= e3.buffer.active.viewportY, this.columnSelectMode ? this.startCol <= this.endCol ? t4 >= this.startCol && i3 >= this.viewportCappedStartRow && t4 < this.endCol && i3 <= this.viewportCappedEndRow : t4 < this.startCol && i3 >= this.viewportCappedStartRow && t4 >= this.endCol && i3 <= this.viewportCappedEndRow : i3 > this.viewportStartRow && i3 < this.viewportEndRow || this.viewportStartRow === this.viewportEndRow && i3 === this.viewportStartRow && t4 >= this.startCol && t4 < this.endCol || this.viewportStartRow < this.viewportEndRow && i3 === this.viewportEndRow && t4 < this.endCol || this.viewportStartRow < this.viewportEndRow && i3 === this.viewportStartRow && t4 >= this.startCol);
        }
      }
      t3.createSelectionRenderModel = function() {
        return new i2();
      };
    }, 456: (e2, t3) => {
      Object.defineProperty(t3, "__esModule", { value: true }), t3.SelectionModel = void 0, t3.SelectionModel = class {
        constructor(e3) {
          this._bufferService = e3, this.isSelectAllActive = false, this.selectionStartLength = 0;
        }
        clearSelection() {
          this.selectionStart = void 0, this.selectionEnd = void 0, this.isSelectAllActive = false, this.selectionStartLength = 0;
        }
        get finalSelectionStart() {
          return this.isSelectAllActive ? [0, 0] : this.selectionEnd && this.selectionStart && this.areSelectionValuesReversed() ? this.selectionEnd : this.selectionStart;
        }
        get finalSelectionEnd() {
          if (this.isSelectAllActive) return [this._bufferService.cols, this._bufferService.buffer.ybase + this._bufferService.rows - 1];
          if (this.selectionStart) {
            if (!this.selectionEnd || this.areSelectionValuesReversed()) {
              const e3 = this.selectionStart[0] + this.selectionStartLength;
              return e3 > this._bufferService.cols ? e3 % this._bufferService.cols == 0 ? [this._bufferService.cols, this.selectionStart[1] + Math.floor(e3 / this._bufferService.cols) - 1] : [e3 % this._bufferService.cols, this.selectionStart[1] + Math.floor(e3 / this._bufferService.cols)] : [e3, this.selectionStart[1]];
            }
            if (this.selectionStartLength && this.selectionEnd[1] === this.selectionStart[1]) {
              const e3 = this.selectionStart[0] + this.selectionStartLength;
              return e3 > this._bufferService.cols ? [e3 % this._bufferService.cols, this.selectionStart[1] + Math.floor(e3 / this._bufferService.cols)] : [Math.max(e3, this.selectionEnd[0]), this.selectionEnd[1]];
            }
            return this.selectionEnd;
          }
        }
        areSelectionValuesReversed() {
          const e3 = this.selectionStart, t4 = this.selectionEnd;
          return !(!e3 || !t4) && (e3[1] > t4[1] || e3[1] === t4[1] && e3[0] > t4[0]);
        }
        handleTrim(e3) {
          return this.selectionStart && (this.selectionStart[1] -= e3), this.selectionEnd && (this.selectionEnd[1] -= e3), this.selectionEnd && this.selectionEnd[1] < 0 ? (this.clearSelection(), true) : (this.selectionStart && this.selectionStart[1] < 0 && (this.selectionStart[1] = 0), false);
        }
      };
    }, 428: function(e2, t3, i2) {
      var s2 = this && this.__decorate || function(e3, t4, i3, s3) {
        var r3, n3 = arguments.length, o2 = n3 < 3 ? t4 : null === s3 ? s3 = Object.getOwnPropertyDescriptor(t4, i3) : s3;
        if ("object" == typeof Reflect && "function" == typeof Reflect.decorate) o2 = Reflect.decorate(e3, t4, i3, s3);
        else for (var a2 = e3.length - 1; a2 >= 0; a2--) (r3 = e3[a2]) && (o2 = (n3 < 3 ? r3(o2) : n3 > 3 ? r3(t4, i3, o2) : r3(t4, i3)) || o2);
        return n3 > 3 && o2 && Object.defineProperty(t4, i3, o2), o2;
      }, r2 = this && this.__param || function(e3, t4) {
        return function(i3, s3) {
          t4(i3, s3, e3);
        };
      };
      Object.defineProperty(t3, "__esModule", { value: true }), t3.CharSizeService = void 0;
      const n2 = i2(2585), o = i2(8460), a = i2(844);
      let h = t3.CharSizeService = class extends a.Disposable {
        get hasValidSize() {
          return this.width > 0 && this.height > 0;
        }
        constructor(e3, t4, i3) {
          super(), this._optionsService = i3, this.width = 0, this.height = 0, this._onCharSizeChange = this.register(new o.EventEmitter()), this.onCharSizeChange = this._onCharSizeChange.event;
          try {
            this._measureStrategy = this.register(new d(this._optionsService));
          } catch {
            this._measureStrategy = this.register(new l2(e3, t4, this._optionsService));
          }
          this.register(this._optionsService.onMultipleOptionChange(["fontFamily", "fontSize"], () => this.measure()));
        }
        measure() {
          const e3 = this._measureStrategy.measure();
          e3.width === this.width && e3.height === this.height || (this.width = e3.width, this.height = e3.height, this._onCharSizeChange.fire());
        }
      };
      t3.CharSizeService = h = s2([r2(2, n2.IOptionsService)], h);
      class c extends a.Disposable {
        constructor() {
          super(...arguments), this._result = { width: 0, height: 0 };
        }
        _validateAndSet(e3, t4) {
          void 0 !== e3 && e3 > 0 && void 0 !== t4 && t4 > 0 && (this._result.width = e3, this._result.height = t4);
        }
      }
      class l2 extends c {
        constructor(e3, t4, i3) {
          super(), this._document = e3, this._parentElement = t4, this._optionsService = i3, this._measureElement = this._document.createElement("span"), this._measureElement.classList.add("xterm-char-measure-element"), this._measureElement.textContent = "W".repeat(32), this._measureElement.setAttribute("aria-hidden", "true"), this._measureElement.style.whiteSpace = "pre", this._measureElement.style.fontKerning = "none", this._parentElement.appendChild(this._measureElement);
        }
        measure() {
          return this._measureElement.style.fontFamily = this._optionsService.rawOptions.fontFamily, this._measureElement.style.fontSize = `${this._optionsService.rawOptions.fontSize}px`, this._validateAndSet(Number(this._measureElement.offsetWidth) / 32, Number(this._measureElement.offsetHeight)), this._result;
        }
      }
      class d extends c {
        constructor(e3) {
          super(), this._optionsService = e3, this._canvas = new OffscreenCanvas(100, 100), this._ctx = this._canvas.getContext("2d");
          const t4 = this._ctx.measureText("W");
          if (!("width" in t4 && "fontBoundingBoxAscent" in t4 && "fontBoundingBoxDescent" in t4)) throw new Error("Required font metrics not supported");
        }
        measure() {
          this._ctx.font = `${this._optionsService.rawOptions.fontSize}px ${this._optionsService.rawOptions.fontFamily}`;
          const e3 = this._ctx.measureText("W");
          return this._validateAndSet(e3.width, e3.fontBoundingBoxAscent + e3.fontBoundingBoxDescent), this._result;
        }
      }
    }, 4269: function(e2, t3, i2) {
      var s2 = this && this.__decorate || function(e3, t4, i3, s3) {
        var r3, n3 = arguments.length, o2 = n3 < 3 ? t4 : null === s3 ? s3 = Object.getOwnPropertyDescriptor(t4, i3) : s3;
        if ("object" == typeof Reflect && "function" == typeof Reflect.decorate) o2 = Reflect.decorate(e3, t4, i3, s3);
        else for (var a2 = e3.length - 1; a2 >= 0; a2--) (r3 = e3[a2]) && (o2 = (n3 < 3 ? r3(o2) : n3 > 3 ? r3(t4, i3, o2) : r3(t4, i3)) || o2);
        return n3 > 3 && o2 && Object.defineProperty(t4, i3, o2), o2;
      }, r2 = this && this.__param || function(e3, t4) {
        return function(i3, s3) {
          t4(i3, s3, e3);
        };
      };
      Object.defineProperty(t3, "__esModule", { value: true }), t3.CharacterJoinerService = t3.JoinedCellData = void 0;
      const n2 = i2(3734), o = i2(643), a = i2(511), h = i2(2585);
      class c extends n2.AttributeData {
        constructor(e3, t4, i3) {
          super(), this.content = 0, this.combinedData = "", this.fg = e3.fg, this.bg = e3.bg, this.combinedData = t4, this._width = i3;
        }
        isCombined() {
          return 2097152;
        }
        getWidth() {
          return this._width;
        }
        getChars() {
          return this.combinedData;
        }
        getCode() {
          return 2097151;
        }
        setFromCharData(e3) {
          throw new Error("not implemented");
        }
        getAsCharData() {
          return [this.fg, this.getChars(), this.getWidth(), this.getCode()];
        }
      }
      t3.JoinedCellData = c;
      let l2 = t3.CharacterJoinerService = class e3 {
        constructor(e4) {
          this._bufferService = e4, this._characterJoiners = [], this._nextCharacterJoinerId = 0, this._workCell = new a.CellData();
        }
        register(e4) {
          const t4 = { id: this._nextCharacterJoinerId++, handler: e4 };
          return this._characterJoiners.push(t4), t4.id;
        }
        deregister(e4) {
          for (let t4 = 0; t4 < this._characterJoiners.length; t4++) if (this._characterJoiners[t4].id === e4) return this._characterJoiners.splice(t4, 1), true;
          return false;
        }
        getJoinedCharacters(e4) {
          if (0 === this._characterJoiners.length) return [];
          const t4 = this._bufferService.buffer.lines.get(e4);
          if (!t4 || 0 === t4.length) return [];
          const i3 = [], s3 = t4.translateToString(true);
          let r3 = 0, n3 = 0, a2 = 0, h2 = t4.getFg(0), c2 = t4.getBg(0);
          for (let e5 = 0; e5 < t4.getTrimmedLength(); e5++) if (t4.loadCell(e5, this._workCell), 0 !== this._workCell.getWidth()) {
            if (this._workCell.fg !== h2 || this._workCell.bg !== c2) {
              if (e5 - r3 > 1) {
                const e6 = this._getJoinedRanges(s3, a2, n3, t4, r3);
                for (let t5 = 0; t5 < e6.length; t5++) i3.push(e6[t5]);
              }
              r3 = e5, a2 = n3, h2 = this._workCell.fg, c2 = this._workCell.bg;
            }
            n3 += this._workCell.getChars().length || o.WHITESPACE_CELL_CHAR.length;
          }
          if (this._bufferService.cols - r3 > 1) {
            const e5 = this._getJoinedRanges(s3, a2, n3, t4, r3);
            for (let t5 = 0; t5 < e5.length; t5++) i3.push(e5[t5]);
          }
          return i3;
        }
        _getJoinedRanges(t4, i3, s3, r3, n3) {
          const o2 = t4.substring(i3, s3);
          let a2 = [];
          try {
            a2 = this._characterJoiners[0].handler(o2);
          } catch (e4) {
            console.error(e4);
          }
          for (let t5 = 1; t5 < this._characterJoiners.length; t5++) try {
            const i4 = this._characterJoiners[t5].handler(o2);
            for (let t6 = 0; t6 < i4.length; t6++) e3._mergeRanges(a2, i4[t6]);
          } catch (e4) {
            console.error(e4);
          }
          return this._stringRangesToCellRanges(a2, r3, n3), a2;
        }
        _stringRangesToCellRanges(e4, t4, i3) {
          let s3 = 0, r3 = false, n3 = 0, a2 = e4[s3];
          if (a2) {
            for (let h2 = i3; h2 < this._bufferService.cols; h2++) {
              const i4 = t4.getWidth(h2), c2 = t4.getString(h2).length || o.WHITESPACE_CELL_CHAR.length;
              if (0 !== i4) {
                if (!r3 && a2[0] <= n3 && (a2[0] = h2, r3 = true), a2[1] <= n3) {
                  if (a2[1] = h2, a2 = e4[++s3], !a2) break;
                  a2[0] <= n3 ? (a2[0] = h2, r3 = true) : r3 = false;
                }
                n3 += c2;
              }
            }
            a2 && (a2[1] = this._bufferService.cols);
          }
        }
        static _mergeRanges(e4, t4) {
          let i3 = false;
          for (let s3 = 0; s3 < e4.length; s3++) {
            const r3 = e4[s3];
            if (i3) {
              if (t4[1] <= r3[0]) return e4[s3 - 1][1] = t4[1], e4;
              if (t4[1] <= r3[1]) return e4[s3 - 1][1] = Math.max(t4[1], r3[1]), e4.splice(s3, 1), e4;
              e4.splice(s3, 1), s3--;
            } else {
              if (t4[1] <= r3[0]) return e4.splice(s3, 0, t4), e4;
              if (t4[1] <= r3[1]) return r3[0] = Math.min(t4[0], r3[0]), e4;
              t4[0] < r3[1] && (r3[0] = Math.min(t4[0], r3[0]), i3 = true);
            }
          }
          return i3 ? e4[e4.length - 1][1] = t4[1] : e4.push(t4), e4;
        }
      };
      t3.CharacterJoinerService = l2 = s2([r2(0, h.IBufferService)], l2);
    }, 5114: (e2, t3, i2) => {
      Object.defineProperty(t3, "__esModule", { value: true }), t3.CoreBrowserService = void 0;
      const s2 = i2(844), r2 = i2(8460), n2 = i2(3656);
      class o extends s2.Disposable {
        constructor(e3, t4, i3) {
          super(), this._textarea = e3, this._window = t4, this.mainDocument = i3, this._isFocused = false, this._cachedIsFocused = void 0, this._screenDprMonitor = new a(this._window), this._onDprChange = this.register(new r2.EventEmitter()), this.onDprChange = this._onDprChange.event, this._onWindowChange = this.register(new r2.EventEmitter()), this.onWindowChange = this._onWindowChange.event, this.register(this.onWindowChange((e4) => this._screenDprMonitor.setWindow(e4))), this.register((0, r2.forwardEvent)(this._screenDprMonitor.onDprChange, this._onDprChange)), this._textarea.addEventListener("focus", () => this._isFocused = true), this._textarea.addEventListener("blur", () => this._isFocused = false);
        }
        get window() {
          return this._window;
        }
        set window(e3) {
          this._window !== e3 && (this._window = e3, this._onWindowChange.fire(this._window));
        }
        get dpr() {
          return this.window.devicePixelRatio;
        }
        get isFocused() {
          return void 0 === this._cachedIsFocused && (this._cachedIsFocused = this._isFocused && this._textarea.ownerDocument.hasFocus(), queueMicrotask(() => this._cachedIsFocused = void 0)), this._cachedIsFocused;
        }
      }
      t3.CoreBrowserService = o;
      class a extends s2.Disposable {
        constructor(e3) {
          super(), this._parentWindow = e3, this._windowResizeListener = this.register(new s2.MutableDisposable()), this._onDprChange = this.register(new r2.EventEmitter()), this.onDprChange = this._onDprChange.event, this._outerListener = () => this._setDprAndFireIfDiffers(), this._currentDevicePixelRatio = this._parentWindow.devicePixelRatio, this._updateDpr(), this._setWindowResizeListener(), this.register((0, s2.toDisposable)(() => this.clearListener()));
        }
        setWindow(e3) {
          this._parentWindow = e3, this._setWindowResizeListener(), this._setDprAndFireIfDiffers();
        }
        _setWindowResizeListener() {
          this._windowResizeListener.value = (0, n2.addDisposableDomListener)(this._parentWindow, "resize", () => this._setDprAndFireIfDiffers());
        }
        _setDprAndFireIfDiffers() {
          this._parentWindow.devicePixelRatio !== this._currentDevicePixelRatio && this._onDprChange.fire(this._parentWindow.devicePixelRatio), this._updateDpr();
        }
        _updateDpr() {
          this._outerListener && (this._resolutionMediaMatchList?.removeListener(this._outerListener), this._currentDevicePixelRatio = this._parentWindow.devicePixelRatio, this._resolutionMediaMatchList = this._parentWindow.matchMedia(`screen and (resolution: ${this._parentWindow.devicePixelRatio}dppx)`), this._resolutionMediaMatchList.addListener(this._outerListener));
        }
        clearListener() {
          this._resolutionMediaMatchList && this._outerListener && (this._resolutionMediaMatchList.removeListener(this._outerListener), this._resolutionMediaMatchList = void 0, this._outerListener = void 0);
        }
      }
    }, 779: (e2, t3, i2) => {
      Object.defineProperty(t3, "__esModule", { value: true }), t3.LinkProviderService = void 0;
      const s2 = i2(844);
      class r2 extends s2.Disposable {
        constructor() {
          super(), this.linkProviders = [], this.register((0, s2.toDisposable)(() => this.linkProviders.length = 0));
        }
        registerLinkProvider(e3) {
          return this.linkProviders.push(e3), { dispose: () => {
            const t4 = this.linkProviders.indexOf(e3);
            -1 !== t4 && this.linkProviders.splice(t4, 1);
          } };
        }
      }
      t3.LinkProviderService = r2;
    }, 8934: function(e2, t3, i2) {
      var s2 = this && this.__decorate || function(e3, t4, i3, s3) {
        var r3, n3 = arguments.length, o2 = n3 < 3 ? t4 : null === s3 ? s3 = Object.getOwnPropertyDescriptor(t4, i3) : s3;
        if ("object" == typeof Reflect && "function" == typeof Reflect.decorate) o2 = Reflect.decorate(e3, t4, i3, s3);
        else for (var a2 = e3.length - 1; a2 >= 0; a2--) (r3 = e3[a2]) && (o2 = (n3 < 3 ? r3(o2) : n3 > 3 ? r3(t4, i3, o2) : r3(t4, i3)) || o2);
        return n3 > 3 && o2 && Object.defineProperty(t4, i3, o2), o2;
      }, r2 = this && this.__param || function(e3, t4) {
        return function(i3, s3) {
          t4(i3, s3, e3);
        };
      };
      Object.defineProperty(t3, "__esModule", { value: true }), t3.MouseService = void 0;
      const n2 = i2(4725), o = i2(9806);
      let a = t3.MouseService = class {
        constructor(e3, t4) {
          this._renderService = e3, this._charSizeService = t4;
        }
        getCoords(e3, t4, i3, s3, r3) {
          return (0, o.getCoords)(window, e3, t4, i3, s3, this._charSizeService.hasValidSize, this._renderService.dimensions.css.cell.width, this._renderService.dimensions.css.cell.height, r3);
        }
        getMouseReportCoords(e3, t4) {
          const i3 = (0, o.getCoordsRelativeToElement)(window, e3, t4);
          if (this._charSizeService.hasValidSize) return i3[0] = Math.min(Math.max(i3[0], 0), this._renderService.dimensions.css.canvas.width - 1), i3[1] = Math.min(Math.max(i3[1], 0), this._renderService.dimensions.css.canvas.height - 1), { col: Math.floor(i3[0] / this._renderService.dimensions.css.cell.width), row: Math.floor(i3[1] / this._renderService.dimensions.css.cell.height), x: Math.floor(i3[0]), y: Math.floor(i3[1]) };
        }
      };
      t3.MouseService = a = s2([r2(0, n2.IRenderService), r2(1, n2.ICharSizeService)], a);
    }, 3230: function(e2, t3, i2) {
      var s2 = this && this.__decorate || function(e3, t4, i3, s3) {
        var r3, n3 = arguments.length, o2 = n3 < 3 ? t4 : null === s3 ? s3 = Object.getOwnPropertyDescriptor(t4, i3) : s3;
        if ("object" == typeof Reflect && "function" == typeof Reflect.decorate) o2 = Reflect.decorate(e3, t4, i3, s3);
        else for (var a2 = e3.length - 1; a2 >= 0; a2--) (r3 = e3[a2]) && (o2 = (n3 < 3 ? r3(o2) : n3 > 3 ? r3(t4, i3, o2) : r3(t4, i3)) || o2);
        return n3 > 3 && o2 && Object.defineProperty(t4, i3, o2), o2;
      }, r2 = this && this.__param || function(e3, t4) {
        return function(i3, s3) {
          t4(i3, s3, e3);
        };
      };
      Object.defineProperty(t3, "__esModule", { value: true }), t3.RenderService = void 0;
      const n2 = i2(6193), o = i2(4725), a = i2(8460), h = i2(844), c = i2(7226), l2 = i2(2585);
      let d = t3.RenderService = class extends h.Disposable {
        get dimensions() {
          return this._renderer.value.dimensions;
        }
        constructor(e3, t4, i3, s3, r3, o2, l3, d2) {
          super(), this._rowCount = e3, this._charSizeService = s3, this._renderer = this.register(new h.MutableDisposable()), this._pausedResizeTask = new c.DebouncedIdleTask(), this._observerDisposable = this.register(new h.MutableDisposable()), this._isPaused = false, this._needsFullRefresh = false, this._isNextRenderRedrawOnly = true, this._needsSelectionRefresh = false, this._canvasWidth = 0, this._canvasHeight = 0, this._selectionState = { start: void 0, end: void 0, columnSelectMode: false }, this._onDimensionsChange = this.register(new a.EventEmitter()), this.onDimensionsChange = this._onDimensionsChange.event, this._onRenderedViewportChange = this.register(new a.EventEmitter()), this.onRenderedViewportChange = this._onRenderedViewportChange.event, this._onRender = this.register(new a.EventEmitter()), this.onRender = this._onRender.event, this._onRefreshRequest = this.register(new a.EventEmitter()), this.onRefreshRequest = this._onRefreshRequest.event, this._renderDebouncer = new n2.RenderDebouncer((e4, t5) => this._renderRows(e4, t5), l3), this.register(this._renderDebouncer), this.register(l3.onDprChange(() => this.handleDevicePixelRatioChange())), this.register(o2.onResize(() => this._fullRefresh())), this.register(o2.buffers.onBufferActivate(() => this._renderer.value?.clear())), this.register(i3.onOptionChange(() => this._handleOptionsChanged())), this.register(this._charSizeService.onCharSizeChange(() => this.handleCharSizeChanged())), this.register(r3.onDecorationRegistered(() => this._fullRefresh())), this.register(r3.onDecorationRemoved(() => this._fullRefresh())), this.register(i3.onMultipleOptionChange(["customGlyphs", "drawBoldTextInBrightColors", "letterSpacing", "lineHeight", "fontFamily", "fontSize", "fontWeight", "fontWeightBold", "minimumContrastRatio", "rescaleOverlappingGlyphs"], () => {
            this.clear(), this.handleResize(o2.cols, o2.rows), this._fullRefresh();
          })), this.register(i3.onMultipleOptionChange(["cursorBlink", "cursorStyle"], () => this.refreshRows(o2.buffer.y, o2.buffer.y, true))), this.register(d2.onChangeColors(() => this._fullRefresh())), this._registerIntersectionObserver(l3.window, t4), this.register(l3.onWindowChange((e4) => this._registerIntersectionObserver(e4, t4)));
        }
        _registerIntersectionObserver(e3, t4) {
          if ("IntersectionObserver" in e3) {
            const i3 = new e3.IntersectionObserver((e4) => this._handleIntersectionChange(e4[e4.length - 1]), { threshold: 0 });
            i3.observe(t4), this._observerDisposable.value = (0, h.toDisposable)(() => i3.disconnect());
          }
        }
        _handleIntersectionChange(e3) {
          this._isPaused = void 0 === e3.isIntersecting ? 0 === e3.intersectionRatio : !e3.isIntersecting, this._isPaused || this._charSizeService.hasValidSize || this._charSizeService.measure(), !this._isPaused && this._needsFullRefresh && (this._pausedResizeTask.flush(), this.refreshRows(0, this._rowCount - 1), this._needsFullRefresh = false);
        }
        refreshRows(e3, t4, i3 = false) {
          this._isPaused ? this._needsFullRefresh = true : (i3 || (this._isNextRenderRedrawOnly = false), this._renderDebouncer.refresh(e3, t4, this._rowCount));
        }
        _renderRows(e3, t4) {
          this._renderer.value && (e3 = Math.min(e3, this._rowCount - 1), t4 = Math.min(t4, this._rowCount - 1), this._renderer.value.renderRows(e3, t4), this._needsSelectionRefresh && (this._renderer.value.handleSelectionChanged(this._selectionState.start, this._selectionState.end, this._selectionState.columnSelectMode), this._needsSelectionRefresh = false), this._isNextRenderRedrawOnly || this._onRenderedViewportChange.fire({ start: e3, end: t4 }), this._onRender.fire({ start: e3, end: t4 }), this._isNextRenderRedrawOnly = true);
        }
        resize(e3, t4) {
          this._rowCount = t4, this._fireOnCanvasResize();
        }
        _handleOptionsChanged() {
          this._renderer.value && (this.refreshRows(0, this._rowCount - 1), this._fireOnCanvasResize());
        }
        _fireOnCanvasResize() {
          this._renderer.value && (this._renderer.value.dimensions.css.canvas.width === this._canvasWidth && this._renderer.value.dimensions.css.canvas.height === this._canvasHeight || this._onDimensionsChange.fire(this._renderer.value.dimensions));
        }
        hasRenderer() {
          return !!this._renderer.value;
        }
        setRenderer(e3) {
          this._renderer.value = e3, this._renderer.value && (this._renderer.value.onRequestRedraw((e4) => this.refreshRows(e4.start, e4.end, true)), this._needsSelectionRefresh = true, this._fullRefresh());
        }
        addRefreshCallback(e3) {
          return this._renderDebouncer.addRefreshCallback(e3);
        }
        _fullRefresh() {
          this._isPaused ? this._needsFullRefresh = true : this.refreshRows(0, this._rowCount - 1);
        }
        clearTextureAtlas() {
          this._renderer.value && (this._renderer.value.clearTextureAtlas?.(), this._fullRefresh());
        }
        handleDevicePixelRatioChange() {
          this._charSizeService.measure(), this._renderer.value && (this._renderer.value.handleDevicePixelRatioChange(), this.refreshRows(0, this._rowCount - 1));
        }
        handleResize(e3, t4) {
          this._renderer.value && (this._isPaused ? this._pausedResizeTask.set(() => this._renderer.value?.handleResize(e3, t4)) : this._renderer.value.handleResize(e3, t4), this._fullRefresh());
        }
        handleCharSizeChanged() {
          this._renderer.value?.handleCharSizeChanged();
        }
        handleBlur() {
          this._renderer.value?.handleBlur();
        }
        handleFocus() {
          this._renderer.value?.handleFocus();
        }
        handleSelectionChanged(e3, t4, i3) {
          this._selectionState.start = e3, this._selectionState.end = t4, this._selectionState.columnSelectMode = i3, this._renderer.value?.handleSelectionChanged(e3, t4, i3);
        }
        handleCursorMove() {
          this._renderer.value?.handleCursorMove();
        }
        clear() {
          this._renderer.value?.clear();
        }
      };
      t3.RenderService = d = s2([r2(2, l2.IOptionsService), r2(3, o.ICharSizeService), r2(4, l2.IDecorationService), r2(5, l2.IBufferService), r2(6, o.ICoreBrowserService), r2(7, o.IThemeService)], d);
    }, 9312: function(e2, t3, i2) {
      var s2 = this && this.__decorate || function(e3, t4, i3, s3) {
        var r3, n3 = arguments.length, o2 = n3 < 3 ? t4 : null === s3 ? s3 = Object.getOwnPropertyDescriptor(t4, i3) : s3;
        if ("object" == typeof Reflect && "function" == typeof Reflect.decorate) o2 = Reflect.decorate(e3, t4, i3, s3);
        else for (var a2 = e3.length - 1; a2 >= 0; a2--) (r3 = e3[a2]) && (o2 = (n3 < 3 ? r3(o2) : n3 > 3 ? r3(t4, i3, o2) : r3(t4, i3)) || o2);
        return n3 > 3 && o2 && Object.defineProperty(t4, i3, o2), o2;
      }, r2 = this && this.__param || function(e3, t4) {
        return function(i3, s3) {
          t4(i3, s3, e3);
        };
      };
      Object.defineProperty(t3, "__esModule", { value: true }), t3.SelectionService = void 0;
      const n2 = i2(9806), o = i2(9504), a = i2(456), h = i2(4725), c = i2(8460), l2 = i2(844), d = i2(6114), _ = i2(4841), u2 = i2(511), f2 = i2(2585), v2 = String.fromCharCode(160), p2 = new RegExp(v2, "g");
      let g = t3.SelectionService = class extends l2.Disposable {
        constructor(e3, t4, i3, s3, r3, n3, o2, h2, d2) {
          super(), this._element = e3, this._screenElement = t4, this._linkifier = i3, this._bufferService = s3, this._coreService = r3, this._mouseService = n3, this._optionsService = o2, this._renderService = h2, this._coreBrowserService = d2, this._dragScrollAmount = 0, this._enabled = true, this._workCell = new u2.CellData(), this._mouseDownTimeStamp = 0, this._oldHasSelection = false, this._oldSelectionStart = void 0, this._oldSelectionEnd = void 0, this._onLinuxMouseSelection = this.register(new c.EventEmitter()), this.onLinuxMouseSelection = this._onLinuxMouseSelection.event, this._onRedrawRequest = this.register(new c.EventEmitter()), this.onRequestRedraw = this._onRedrawRequest.event, this._onSelectionChange = this.register(new c.EventEmitter()), this.onSelectionChange = this._onSelectionChange.event, this._onRequestScrollLines = this.register(new c.EventEmitter()), this.onRequestScrollLines = this._onRequestScrollLines.event, this._mouseMoveListener = (e4) => this._handleMouseMove(e4), this._mouseUpListener = (e4) => this._handleMouseUp(e4), this._coreService.onUserInput(() => {
            this.hasSelection && this.clearSelection();
          }), this._trimListener = this._bufferService.buffer.lines.onTrim((e4) => this._handleTrim(e4)), this.register(this._bufferService.buffers.onBufferActivate((e4) => this._handleBufferActivate(e4))), this.enable(), this._model = new a.SelectionModel(this._bufferService), this._activeSelectionMode = 0, this.register((0, l2.toDisposable)(() => {
            this._removeMouseDownListeners();
          }));
        }
        reset() {
          this.clearSelection();
        }
        disable() {
          this.clearSelection(), this._enabled = false;
        }
        enable() {
          this._enabled = true;
        }
        get selectionStart() {
          return this._model.finalSelectionStart;
        }
        get selectionEnd() {
          return this._model.finalSelectionEnd;
        }
        get hasSelection() {
          const e3 = this._model.finalSelectionStart, t4 = this._model.finalSelectionEnd;
          return !(!e3 || !t4 || e3[0] === t4[0] && e3[1] === t4[1]);
        }
        get selectionText() {
          const e3 = this._model.finalSelectionStart, t4 = this._model.finalSelectionEnd;
          if (!e3 || !t4) return "";
          const i3 = this._bufferService.buffer, s3 = [];
          if (3 === this._activeSelectionMode) {
            if (e3[0] === t4[0]) return "";
            const r3 = e3[0] < t4[0] ? e3[0] : t4[0], n3 = e3[0] < t4[0] ? t4[0] : e3[0];
            for (let o2 = e3[1]; o2 <= t4[1]; o2++) {
              const e4 = i3.translateBufferLineToString(o2, true, r3, n3);
              s3.push(e4);
            }
          } else {
            const r3 = e3[1] === t4[1] ? t4[0] : void 0;
            s3.push(i3.translateBufferLineToString(e3[1], true, e3[0], r3));
            for (let r4 = e3[1] + 1; r4 <= t4[1] - 1; r4++) {
              const e4 = i3.lines.get(r4), t5 = i3.translateBufferLineToString(r4, true);
              e4?.isWrapped ? s3[s3.length - 1] += t5 : s3.push(t5);
            }
            if (e3[1] !== t4[1]) {
              const e4 = i3.lines.get(t4[1]), r4 = i3.translateBufferLineToString(t4[1], true, 0, t4[0]);
              e4 && e4.isWrapped ? s3[s3.length - 1] += r4 : s3.push(r4);
            }
          }
          return s3.map((e4) => e4.replace(p2, " ")).join(d.isWindows ? "\r\n" : "\n");
        }
        clearSelection() {
          this._model.clearSelection(), this._removeMouseDownListeners(), this.refresh(), this._onSelectionChange.fire();
        }
        refresh(e3) {
          this._refreshAnimationFrame || (this._refreshAnimationFrame = this._coreBrowserService.window.requestAnimationFrame(() => this._refresh())), d.isLinux && e3 && this.selectionText.length && this._onLinuxMouseSelection.fire(this.selectionText);
        }
        _refresh() {
          this._refreshAnimationFrame = void 0, this._onRedrawRequest.fire({ start: this._model.finalSelectionStart, end: this._model.finalSelectionEnd, columnSelectMode: 3 === this._activeSelectionMode });
        }
        _isClickInSelection(e3) {
          const t4 = this._getMouseBufferCoords(e3), i3 = this._model.finalSelectionStart, s3 = this._model.finalSelectionEnd;
          return !!(i3 && s3 && t4) && this._areCoordsInSelection(t4, i3, s3);
        }
        isCellInSelection(e3, t4) {
          const i3 = this._model.finalSelectionStart, s3 = this._model.finalSelectionEnd;
          return !(!i3 || !s3) && this._areCoordsInSelection([e3, t4], i3, s3);
        }
        _areCoordsInSelection(e3, t4, i3) {
          return e3[1] > t4[1] && e3[1] < i3[1] || t4[1] === i3[1] && e3[1] === t4[1] && e3[0] >= t4[0] && e3[0] < i3[0] || t4[1] < i3[1] && e3[1] === i3[1] && e3[0] < i3[0] || t4[1] < i3[1] && e3[1] === t4[1] && e3[0] >= t4[0];
        }
        _selectWordAtCursor(e3, t4) {
          const i3 = this._linkifier.currentLink?.link?.range;
          if (i3) return this._model.selectionStart = [i3.start.x - 1, i3.start.y - 1], this._model.selectionStartLength = (0, _.getRangeLength)(i3, this._bufferService.cols), this._model.selectionEnd = void 0, true;
          const s3 = this._getMouseBufferCoords(e3);
          return !!s3 && (this._selectWordAt(s3, t4), this._model.selectionEnd = void 0, true);
        }
        selectAll() {
          this._model.isSelectAllActive = true, this.refresh(), this._onSelectionChange.fire();
        }
        selectLines(e3, t4) {
          this._model.clearSelection(), e3 = Math.max(e3, 0), t4 = Math.min(t4, this._bufferService.buffer.lines.length - 1), this._model.selectionStart = [0, e3], this._model.selectionEnd = [this._bufferService.cols, t4], this.refresh(), this._onSelectionChange.fire();
        }
        _handleTrim(e3) {
          this._model.handleTrim(e3) && this.refresh();
        }
        _getMouseBufferCoords(e3) {
          const t4 = this._mouseService.getCoords(e3, this._screenElement, this._bufferService.cols, this._bufferService.rows, true);
          if (t4) return t4[0]--, t4[1]--, t4[1] += this._bufferService.buffer.ydisp, t4;
        }
        _getMouseEventScrollAmount(e3) {
          let t4 = (0, n2.getCoordsRelativeToElement)(this._coreBrowserService.window, e3, this._screenElement)[1];
          const i3 = this._renderService.dimensions.css.canvas.height;
          return t4 >= 0 && t4 <= i3 ? 0 : (t4 > i3 && (t4 -= i3), t4 = Math.min(Math.max(t4, -50), 50), t4 /= 50, t4 / Math.abs(t4) + Math.round(14 * t4));
        }
        shouldForceSelection(e3) {
          return d.isMac ? e3.altKey && this._optionsService.rawOptions.macOptionClickForcesSelection : e3.shiftKey;
        }
        handleMouseDown(e3) {
          if (this._mouseDownTimeStamp = e3.timeStamp, (2 !== e3.button || !this.hasSelection) && 0 === e3.button) {
            if (!this._enabled) {
              if (!this.shouldForceSelection(e3)) return;
              e3.stopPropagation();
            }
            e3.preventDefault(), this._dragScrollAmount = 0, this._enabled && e3.shiftKey ? this._handleIncrementalClick(e3) : 1 === e3.detail ? this._handleSingleClick(e3) : 2 === e3.detail ? this._handleDoubleClick(e3) : 3 === e3.detail && this._handleTripleClick(e3), this._addMouseDownListeners(), this.refresh(true);
          }
        }
        _addMouseDownListeners() {
          this._screenElement.ownerDocument && (this._screenElement.ownerDocument.addEventListener("mousemove", this._mouseMoveListener), this._screenElement.ownerDocument.addEventListener("mouseup", this._mouseUpListener)), this._dragScrollIntervalTimer = this._coreBrowserService.window.setInterval(() => this._dragScroll(), 50);
        }
        _removeMouseDownListeners() {
          this._screenElement.ownerDocument && (this._screenElement.ownerDocument.removeEventListener("mousemove", this._mouseMoveListener), this._screenElement.ownerDocument.removeEventListener("mouseup", this._mouseUpListener)), this._coreBrowserService.window.clearInterval(this._dragScrollIntervalTimer), this._dragScrollIntervalTimer = void 0;
        }
        _handleIncrementalClick(e3) {
          this._model.selectionStart && (this._model.selectionEnd = this._getMouseBufferCoords(e3));
        }
        _handleSingleClick(e3) {
          if (this._model.selectionStartLength = 0, this._model.isSelectAllActive = false, this._activeSelectionMode = this.shouldColumnSelect(e3) ? 3 : 0, this._model.selectionStart = this._getMouseBufferCoords(e3), !this._model.selectionStart) return;
          this._model.selectionEnd = void 0;
          const t4 = this._bufferService.buffer.lines.get(this._model.selectionStart[1]);
          t4 && t4.length !== this._model.selectionStart[0] && 0 === t4.hasWidth(this._model.selectionStart[0]) && this._model.selectionStart[0]++;
        }
        _handleDoubleClick(e3) {
          this._selectWordAtCursor(e3, true) && (this._activeSelectionMode = 1);
        }
        _handleTripleClick(e3) {
          const t4 = this._getMouseBufferCoords(e3);
          t4 && (this._activeSelectionMode = 2, this._selectLineAt(t4[1]));
        }
        shouldColumnSelect(e3) {
          return e3.altKey && !(d.isMac && this._optionsService.rawOptions.macOptionClickForcesSelection);
        }
        _handleMouseMove(e3) {
          if (e3.stopImmediatePropagation(), !this._model.selectionStart) return;
          const t4 = this._model.selectionEnd ? [this._model.selectionEnd[0], this._model.selectionEnd[1]] : null;
          if (this._model.selectionEnd = this._getMouseBufferCoords(e3), !this._model.selectionEnd) return void this.refresh(true);
          2 === this._activeSelectionMode ? this._model.selectionEnd[1] < this._model.selectionStart[1] ? this._model.selectionEnd[0] = 0 : this._model.selectionEnd[0] = this._bufferService.cols : 1 === this._activeSelectionMode && this._selectToWordAt(this._model.selectionEnd), this._dragScrollAmount = this._getMouseEventScrollAmount(e3), 3 !== this._activeSelectionMode && (this._dragScrollAmount > 0 ? this._model.selectionEnd[0] = this._bufferService.cols : this._dragScrollAmount < 0 && (this._model.selectionEnd[0] = 0));
          const i3 = this._bufferService.buffer;
          if (this._model.selectionEnd[1] < i3.lines.length) {
            const e4 = i3.lines.get(this._model.selectionEnd[1]);
            e4 && 0 === e4.hasWidth(this._model.selectionEnd[0]) && this._model.selectionEnd[0] < this._bufferService.cols && this._model.selectionEnd[0]++;
          }
          t4 && t4[0] === this._model.selectionEnd[0] && t4[1] === this._model.selectionEnd[1] || this.refresh(true);
        }
        _dragScroll() {
          if (this._model.selectionEnd && this._model.selectionStart && this._dragScrollAmount) {
            this._onRequestScrollLines.fire({ amount: this._dragScrollAmount, suppressScrollEvent: false });
            const e3 = this._bufferService.buffer;
            this._dragScrollAmount > 0 ? (3 !== this._activeSelectionMode && (this._model.selectionEnd[0] = this._bufferService.cols), this._model.selectionEnd[1] = Math.min(e3.ydisp + this._bufferService.rows, e3.lines.length - 1)) : (3 !== this._activeSelectionMode && (this._model.selectionEnd[0] = 0), this._model.selectionEnd[1] = e3.ydisp), this.refresh();
          }
        }
        _handleMouseUp(e3) {
          const t4 = e3.timeStamp - this._mouseDownTimeStamp;
          if (this._removeMouseDownListeners(), this.selectionText.length <= 1 && t4 < 500 && e3.altKey && this._optionsService.rawOptions.altClickMovesCursor) {
            if (this._bufferService.buffer.ybase === this._bufferService.buffer.ydisp) {
              const t5 = this._mouseService.getCoords(e3, this._element, this._bufferService.cols, this._bufferService.rows, false);
              if (t5 && void 0 !== t5[0] && void 0 !== t5[1]) {
                const e4 = (0, o.moveToCellSequence)(t5[0] - 1, t5[1] - 1, this._bufferService, this._coreService.decPrivateModes.applicationCursorKeys);
                this._coreService.triggerDataEvent(e4, true);
              }
            }
          } else this._fireEventIfSelectionChanged();
        }
        _fireEventIfSelectionChanged() {
          const e3 = this._model.finalSelectionStart, t4 = this._model.finalSelectionEnd, i3 = !(!e3 || !t4 || e3[0] === t4[0] && e3[1] === t4[1]);
          i3 ? e3 && t4 && (this._oldSelectionStart && this._oldSelectionEnd && e3[0] === this._oldSelectionStart[0] && e3[1] === this._oldSelectionStart[1] && t4[0] === this._oldSelectionEnd[0] && t4[1] === this._oldSelectionEnd[1] || this._fireOnSelectionChange(e3, t4, i3)) : this._oldHasSelection && this._fireOnSelectionChange(e3, t4, i3);
        }
        _fireOnSelectionChange(e3, t4, i3) {
          this._oldSelectionStart = e3, this._oldSelectionEnd = t4, this._oldHasSelection = i3, this._onSelectionChange.fire();
        }
        _handleBufferActivate(e3) {
          this.clearSelection(), this._trimListener.dispose(), this._trimListener = e3.activeBuffer.lines.onTrim((e4) => this._handleTrim(e4));
        }
        _convertViewportColToCharacterIndex(e3, t4) {
          let i3 = t4;
          for (let s3 = 0; t4 >= s3; s3++) {
            const r3 = e3.loadCell(s3, this._workCell).getChars().length;
            0 === this._workCell.getWidth() ? i3-- : r3 > 1 && t4 !== s3 && (i3 += r3 - 1);
          }
          return i3;
        }
        setSelection(e3, t4, i3) {
          this._model.clearSelection(), this._removeMouseDownListeners(), this._model.selectionStart = [e3, t4], this._model.selectionStartLength = i3, this.refresh(), this._fireEventIfSelectionChanged();
        }
        rightClickSelect(e3) {
          this._isClickInSelection(e3) || (this._selectWordAtCursor(e3, false) && this.refresh(true), this._fireEventIfSelectionChanged());
        }
        _getWordAt(e3, t4, i3 = true, s3 = true) {
          if (e3[0] >= this._bufferService.cols) return;
          const r3 = this._bufferService.buffer, n3 = r3.lines.get(e3[1]);
          if (!n3) return;
          const o2 = r3.translateBufferLineToString(e3[1], false);
          let a2 = this._convertViewportColToCharacterIndex(n3, e3[0]), h2 = a2;
          const c2 = e3[0] - a2;
          let l3 = 0, d2 = 0, _2 = 0, u3 = 0;
          if (" " === o2.charAt(a2)) {
            for (; a2 > 0 && " " === o2.charAt(a2 - 1); ) a2--;
            for (; h2 < o2.length && " " === o2.charAt(h2 + 1); ) h2++;
          } else {
            let t5 = e3[0], i4 = e3[0];
            0 === n3.getWidth(t5) && (l3++, t5--), 2 === n3.getWidth(i4) && (d2++, i4++);
            const s4 = n3.getString(i4).length;
            for (s4 > 1 && (u3 += s4 - 1, h2 += s4 - 1); t5 > 0 && a2 > 0 && !this._isCharWordSeparator(n3.loadCell(t5 - 1, this._workCell)); ) {
              n3.loadCell(t5 - 1, this._workCell);
              const e4 = this._workCell.getChars().length;
              0 === this._workCell.getWidth() ? (l3++, t5--) : e4 > 1 && (_2 += e4 - 1, a2 -= e4 - 1), a2--, t5--;
            }
            for (; i4 < n3.length && h2 + 1 < o2.length && !this._isCharWordSeparator(n3.loadCell(i4 + 1, this._workCell)); ) {
              n3.loadCell(i4 + 1, this._workCell);
              const e4 = this._workCell.getChars().length;
              2 === this._workCell.getWidth() ? (d2++, i4++) : e4 > 1 && (u3 += e4 - 1, h2 += e4 - 1), h2++, i4++;
            }
          }
          h2++;
          let f3 = a2 + c2 - l3 + _2, v3 = Math.min(this._bufferService.cols, h2 - a2 + l3 + d2 - _2 - u3);
          if (t4 || "" !== o2.slice(a2, h2).trim()) {
            if (i3 && 0 === f3 && 32 !== n3.getCodePoint(0)) {
              const t5 = r3.lines.get(e3[1] - 1);
              if (t5 && n3.isWrapped && 32 !== t5.getCodePoint(this._bufferService.cols - 1)) {
                const t6 = this._getWordAt([this._bufferService.cols - 1, e3[1] - 1], false, true, false);
                if (t6) {
                  const e4 = this._bufferService.cols - t6.start;
                  f3 -= e4, v3 += e4;
                }
              }
            }
            if (s3 && f3 + v3 === this._bufferService.cols && 32 !== n3.getCodePoint(this._bufferService.cols - 1)) {
              const t5 = r3.lines.get(e3[1] + 1);
              if (t5?.isWrapped && 32 !== t5.getCodePoint(0)) {
                const t6 = this._getWordAt([0, e3[1] + 1], false, false, true);
                t6 && (v3 += t6.length);
              }
            }
            return { start: f3, length: v3 };
          }
        }
        _selectWordAt(e3, t4) {
          const i3 = this._getWordAt(e3, t4);
          if (i3) {
            for (; i3.start < 0; ) i3.start += this._bufferService.cols, e3[1]--;
            this._model.selectionStart = [i3.start, e3[1]], this._model.selectionStartLength = i3.length;
          }
        }
        _selectToWordAt(e3) {
          const t4 = this._getWordAt(e3, true);
          if (t4) {
            let i3 = e3[1];
            for (; t4.start < 0; ) t4.start += this._bufferService.cols, i3--;
            if (!this._model.areSelectionValuesReversed()) for (; t4.start + t4.length > this._bufferService.cols; ) t4.length -= this._bufferService.cols, i3++;
            this._model.selectionEnd = [this._model.areSelectionValuesReversed() ? t4.start : t4.start + t4.length, i3];
          }
        }
        _isCharWordSeparator(e3) {
          return 0 !== e3.getWidth() && this._optionsService.rawOptions.wordSeparator.indexOf(e3.getChars()) >= 0;
        }
        _selectLineAt(e3) {
          const t4 = this._bufferService.buffer.getWrappedRangeForLine(e3), i3 = { start: { x: 0, y: t4.first }, end: { x: this._bufferService.cols - 1, y: t4.last } };
          this._model.selectionStart = [0, t4.first], this._model.selectionEnd = void 0, this._model.selectionStartLength = (0, _.getRangeLength)(i3, this._bufferService.cols);
        }
      };
      t3.SelectionService = g = s2([r2(3, f2.IBufferService), r2(4, f2.ICoreService), r2(5, h.IMouseService), r2(6, f2.IOptionsService), r2(7, h.IRenderService), r2(8, h.ICoreBrowserService)], g);
    }, 4725: (e2, t3, i2) => {
      Object.defineProperty(t3, "__esModule", { value: true }), t3.ILinkProviderService = t3.IThemeService = t3.ICharacterJoinerService = t3.ISelectionService = t3.IRenderService = t3.IMouseService = t3.ICoreBrowserService = t3.ICharSizeService = void 0;
      const s2 = i2(8343);
      t3.ICharSizeService = (0, s2.createDecorator)("CharSizeService"), t3.ICoreBrowserService = (0, s2.createDecorator)("CoreBrowserService"), t3.IMouseService = (0, s2.createDecorator)("MouseService"), t3.IRenderService = (0, s2.createDecorator)("RenderService"), t3.ISelectionService = (0, s2.createDecorator)("SelectionService"), t3.ICharacterJoinerService = (0, s2.createDecorator)("CharacterJoinerService"), t3.IThemeService = (0, s2.createDecorator)("ThemeService"), t3.ILinkProviderService = (0, s2.createDecorator)("LinkProviderService");
    }, 6731: function(e2, t3, i2) {
      var s2 = this && this.__decorate || function(e3, t4, i3, s3) {
        var r3, n3 = arguments.length, o2 = n3 < 3 ? t4 : null === s3 ? s3 = Object.getOwnPropertyDescriptor(t4, i3) : s3;
        if ("object" == typeof Reflect && "function" == typeof Reflect.decorate) o2 = Reflect.decorate(e3, t4, i3, s3);
        else for (var a2 = e3.length - 1; a2 >= 0; a2--) (r3 = e3[a2]) && (o2 = (n3 < 3 ? r3(o2) : n3 > 3 ? r3(t4, i3, o2) : r3(t4, i3)) || o2);
        return n3 > 3 && o2 && Object.defineProperty(t4, i3, o2), o2;
      }, r2 = this && this.__param || function(e3, t4) {
        return function(i3, s3) {
          t4(i3, s3, e3);
        };
      };
      Object.defineProperty(t3, "__esModule", { value: true }), t3.ThemeService = t3.DEFAULT_ANSI_COLORS = void 0;
      const n2 = i2(7239), o = i2(8055), a = i2(8460), h = i2(844), c = i2(2585), l2 = o.css.toColor("#ffffff"), d = o.css.toColor("#000000"), _ = o.css.toColor("#ffffff"), u2 = o.css.toColor("#000000"), f2 = { css: "rgba(255, 255, 255, 0.3)", rgba: 4294967117 };
      t3.DEFAULT_ANSI_COLORS = Object.freeze((() => {
        const e3 = [o.css.toColor("#2e3436"), o.css.toColor("#cc0000"), o.css.toColor("#4e9a06"), o.css.toColor("#c4a000"), o.css.toColor("#3465a4"), o.css.toColor("#75507b"), o.css.toColor("#06989a"), o.css.toColor("#d3d7cf"), o.css.toColor("#555753"), o.css.toColor("#ef2929"), o.css.toColor("#8ae234"), o.css.toColor("#fce94f"), o.css.toColor("#729fcf"), o.css.toColor("#ad7fa8"), o.css.toColor("#34e2e2"), o.css.toColor("#eeeeec")], t4 = [0, 95, 135, 175, 215, 255];
        for (let i3 = 0; i3 < 216; i3++) {
          const s3 = t4[i3 / 36 % 6 | 0], r3 = t4[i3 / 6 % 6 | 0], n3 = t4[i3 % 6];
          e3.push({ css: o.channels.toCss(s3, r3, n3), rgba: o.channels.toRgba(s3, r3, n3) });
        }
        for (let t5 = 0; t5 < 24; t5++) {
          const i3 = 8 + 10 * t5;
          e3.push({ css: o.channels.toCss(i3, i3, i3), rgba: o.channels.toRgba(i3, i3, i3) });
        }
        return e3;
      })());
      let v2 = t3.ThemeService = class extends h.Disposable {
        get colors() {
          return this._colors;
        }
        constructor(e3) {
          super(), this._optionsService = e3, this._contrastCache = new n2.ColorContrastCache(), this._halfContrastCache = new n2.ColorContrastCache(), this._onChangeColors = this.register(new a.EventEmitter()), this.onChangeColors = this._onChangeColors.event, this._colors = { foreground: l2, background: d, cursor: _, cursorAccent: u2, selectionForeground: void 0, selectionBackgroundTransparent: f2, selectionBackgroundOpaque: o.color.blend(d, f2), selectionInactiveBackgroundTransparent: f2, selectionInactiveBackgroundOpaque: o.color.blend(d, f2), ansi: t3.DEFAULT_ANSI_COLORS.slice(), contrastCache: this._contrastCache, halfContrastCache: this._halfContrastCache }, this._updateRestoreColors(), this._setTheme(this._optionsService.rawOptions.theme), this.register(this._optionsService.onSpecificOptionChange("minimumContrastRatio", () => this._contrastCache.clear())), this.register(this._optionsService.onSpecificOptionChange("theme", () => this._setTheme(this._optionsService.rawOptions.theme)));
        }
        _setTheme(e3 = {}) {
          const i3 = this._colors;
          if (i3.foreground = p2(e3.foreground, l2), i3.background = p2(e3.background, d), i3.cursor = p2(e3.cursor, _), i3.cursorAccent = p2(e3.cursorAccent, u2), i3.selectionBackgroundTransparent = p2(e3.selectionBackground, f2), i3.selectionBackgroundOpaque = o.color.blend(i3.background, i3.selectionBackgroundTransparent), i3.selectionInactiveBackgroundTransparent = p2(e3.selectionInactiveBackground, i3.selectionBackgroundTransparent), i3.selectionInactiveBackgroundOpaque = o.color.blend(i3.background, i3.selectionInactiveBackgroundTransparent), i3.selectionForeground = e3.selectionForeground ? p2(e3.selectionForeground, o.NULL_COLOR) : void 0, i3.selectionForeground === o.NULL_COLOR && (i3.selectionForeground = void 0), o.color.isOpaque(i3.selectionBackgroundTransparent)) {
            const e4 = 0.3;
            i3.selectionBackgroundTransparent = o.color.opacity(i3.selectionBackgroundTransparent, e4);
          }
          if (o.color.isOpaque(i3.selectionInactiveBackgroundTransparent)) {
            const e4 = 0.3;
            i3.selectionInactiveBackgroundTransparent = o.color.opacity(i3.selectionInactiveBackgroundTransparent, e4);
          }
          if (i3.ansi = t3.DEFAULT_ANSI_COLORS.slice(), i3.ansi[0] = p2(e3.black, t3.DEFAULT_ANSI_COLORS[0]), i3.ansi[1] = p2(e3.red, t3.DEFAULT_ANSI_COLORS[1]), i3.ansi[2] = p2(e3.green, t3.DEFAULT_ANSI_COLORS[2]), i3.ansi[3] = p2(e3.yellow, t3.DEFAULT_ANSI_COLORS[3]), i3.ansi[4] = p2(e3.blue, t3.DEFAULT_ANSI_COLORS[4]), i3.ansi[5] = p2(e3.magenta, t3.DEFAULT_ANSI_COLORS[5]), i3.ansi[6] = p2(e3.cyan, t3.DEFAULT_ANSI_COLORS[6]), i3.ansi[7] = p2(e3.white, t3.DEFAULT_ANSI_COLORS[7]), i3.ansi[8] = p2(e3.brightBlack, t3.DEFAULT_ANSI_COLORS[8]), i3.ansi[9] = p2(e3.brightRed, t3.DEFAULT_ANSI_COLORS[9]), i3.ansi[10] = p2(e3.brightGreen, t3.DEFAULT_ANSI_COLORS[10]), i3.ansi[11] = p2(e3.brightYellow, t3.DEFAULT_ANSI_COLORS[11]), i3.ansi[12] = p2(e3.brightBlue, t3.DEFAULT_ANSI_COLORS[12]), i3.ansi[13] = p2(e3.brightMagenta, t3.DEFAULT_ANSI_COLORS[13]), i3.ansi[14] = p2(e3.brightCyan, t3.DEFAULT_ANSI_COLORS[14]), i3.ansi[15] = p2(e3.brightWhite, t3.DEFAULT_ANSI_COLORS[15]), e3.extendedAnsi) {
            const s3 = Math.min(i3.ansi.length - 16, e3.extendedAnsi.length);
            for (let r3 = 0; r3 < s3; r3++) i3.ansi[r3 + 16] = p2(e3.extendedAnsi[r3], t3.DEFAULT_ANSI_COLORS[r3 + 16]);
          }
          this._contrastCache.clear(), this._halfContrastCache.clear(), this._updateRestoreColors(), this._onChangeColors.fire(this.colors);
        }
        restoreColor(e3) {
          this._restoreColor(e3), this._onChangeColors.fire(this.colors);
        }
        _restoreColor(e3) {
          if (void 0 !== e3) switch (e3) {
            case 256:
              this._colors.foreground = this._restoreColors.foreground;
              break;
            case 257:
              this._colors.background = this._restoreColors.background;
              break;
            case 258:
              this._colors.cursor = this._restoreColors.cursor;
              break;
            default:
              this._colors.ansi[e3] = this._restoreColors.ansi[e3];
          }
          else for (let e4 = 0; e4 < this._restoreColors.ansi.length; ++e4) this._colors.ansi[e4] = this._restoreColors.ansi[e4];
        }
        modifyColors(e3) {
          e3(this._colors), this._onChangeColors.fire(this.colors);
        }
        _updateRestoreColors() {
          this._restoreColors = { foreground: this._colors.foreground, background: this._colors.background, cursor: this._colors.cursor, ansi: this._colors.ansi.slice() };
        }
      };
      function p2(e3, t4) {
        if (void 0 !== e3) try {
          return o.css.toColor(e3);
        } catch {
        }
        return t4;
      }
      t3.ThemeService = v2 = s2([r2(0, c.IOptionsService)], v2);
    }, 6349: (e2, t3, i2) => {
      Object.defineProperty(t3, "__esModule", { value: true }), t3.CircularList = void 0;
      const s2 = i2(8460), r2 = i2(844);
      class n2 extends r2.Disposable {
        constructor(e3) {
          super(), this._maxLength = e3, this.onDeleteEmitter = this.register(new s2.EventEmitter()), this.onDelete = this.onDeleteEmitter.event, this.onInsertEmitter = this.register(new s2.EventEmitter()), this.onInsert = this.onInsertEmitter.event, this.onTrimEmitter = this.register(new s2.EventEmitter()), this.onTrim = this.onTrimEmitter.event, this._array = new Array(this._maxLength), this._startIndex = 0, this._length = 0;
        }
        get maxLength() {
          return this._maxLength;
        }
        set maxLength(e3) {
          if (this._maxLength === e3) return;
          const t4 = new Array(e3);
          for (let i3 = 0; i3 < Math.min(e3, this.length); i3++) t4[i3] = this._array[this._getCyclicIndex(i3)];
          this._array = t4, this._maxLength = e3, this._startIndex = 0;
        }
        get length() {
          return this._length;
        }
        set length(e3) {
          if (e3 > this._length) for (let t4 = this._length; t4 < e3; t4++) this._array[t4] = void 0;
          this._length = e3;
        }
        get(e3) {
          return this._array[this._getCyclicIndex(e3)];
        }
        set(e3, t4) {
          this._array[this._getCyclicIndex(e3)] = t4;
        }
        push(e3) {
          this._array[this._getCyclicIndex(this._length)] = e3, this._length === this._maxLength ? (this._startIndex = ++this._startIndex % this._maxLength, this.onTrimEmitter.fire(1)) : this._length++;
        }
        recycle() {
          if (this._length !== this._maxLength) throw new Error("Can only recycle when the buffer is full");
          return this._startIndex = ++this._startIndex % this._maxLength, this.onTrimEmitter.fire(1), this._array[this._getCyclicIndex(this._length - 1)];
        }
        get isFull() {
          return this._length === this._maxLength;
        }
        pop() {
          return this._array[this._getCyclicIndex(this._length-- - 1)];
        }
        splice(e3, t4, ...i3) {
          if (t4) {
            for (let i4 = e3; i4 < this._length - t4; i4++) this._array[this._getCyclicIndex(i4)] = this._array[this._getCyclicIndex(i4 + t4)];
            this._length -= t4, this.onDeleteEmitter.fire({ index: e3, amount: t4 });
          }
          for (let t5 = this._length - 1; t5 >= e3; t5--) this._array[this._getCyclicIndex(t5 + i3.length)] = this._array[this._getCyclicIndex(t5)];
          for (let t5 = 0; t5 < i3.length; t5++) this._array[this._getCyclicIndex(e3 + t5)] = i3[t5];
          if (i3.length && this.onInsertEmitter.fire({ index: e3, amount: i3.length }), this._length + i3.length > this._maxLength) {
            const e4 = this._length + i3.length - this._maxLength;
            this._startIndex += e4, this._length = this._maxLength, this.onTrimEmitter.fire(e4);
          } else this._length += i3.length;
        }
        trimStart(e3) {
          e3 > this._length && (e3 = this._length), this._startIndex += e3, this._length -= e3, this.onTrimEmitter.fire(e3);
        }
        shiftElements(e3, t4, i3) {
          if (!(t4 <= 0)) {
            if (e3 < 0 || e3 >= this._length) throw new Error("start argument out of range");
            if (e3 + i3 < 0) throw new Error("Cannot shift elements in list beyond index 0");
            if (i3 > 0) {
              for (let s4 = t4 - 1; s4 >= 0; s4--) this.set(e3 + s4 + i3, this.get(e3 + s4));
              const s3 = e3 + t4 + i3 - this._length;
              if (s3 > 0) for (this._length += s3; this._length > this._maxLength; ) this._length--, this._startIndex++, this.onTrimEmitter.fire(1);
            } else for (let s3 = 0; s3 < t4; s3++) this.set(e3 + s3 + i3, this.get(e3 + s3));
          }
        }
        _getCyclicIndex(e3) {
          return (this._startIndex + e3) % this._maxLength;
        }
      }
      t3.CircularList = n2;
    }, 1439: (e2, t3) => {
      Object.defineProperty(t3, "__esModule", { value: true }), t3.clone = void 0, t3.clone = function e3(t4, i2 = 5) {
        if ("object" != typeof t4) return t4;
        const s2 = Array.isArray(t4) ? [] : {};
        for (const r2 in t4) s2[r2] = i2 <= 1 ? t4[r2] : t4[r2] && e3(t4[r2], i2 - 1);
        return s2;
      };
    }, 8055: (e2, t3) => {
      Object.defineProperty(t3, "__esModule", { value: true }), t3.contrastRatio = t3.toPaddedHex = t3.rgba = t3.rgb = t3.css = t3.color = t3.channels = t3.NULL_COLOR = void 0;
      let i2 = 0, s2 = 0, r2 = 0, n2 = 0;
      var o, a, h, c, l2;
      function d(e3) {
        const t4 = e3.toString(16);
        return t4.length < 2 ? "0" + t4 : t4;
      }
      function _(e3, t4) {
        return e3 < t4 ? (t4 + 0.05) / (e3 + 0.05) : (e3 + 0.05) / (t4 + 0.05);
      }
      t3.NULL_COLOR = { css: "#00000000", rgba: 0 }, function(e3) {
        e3.toCss = function(e4, t4, i3, s3) {
          return void 0 !== s3 ? `#${d(e4)}${d(t4)}${d(i3)}${d(s3)}` : `#${d(e4)}${d(t4)}${d(i3)}`;
        }, e3.toRgba = function(e4, t4, i3, s3 = 255) {
          return (e4 << 24 | t4 << 16 | i3 << 8 | s3) >>> 0;
        }, e3.toColor = function(t4, i3, s3, r3) {
          return { css: e3.toCss(t4, i3, s3, r3), rgba: e3.toRgba(t4, i3, s3, r3) };
        };
      }(o || (t3.channels = o = {})), function(e3) {
        function t4(e4, t5) {
          return n2 = Math.round(255 * t5), [i2, s2, r2] = l2.toChannels(e4.rgba), { css: o.toCss(i2, s2, r2, n2), rgba: o.toRgba(i2, s2, r2, n2) };
        }
        e3.blend = function(e4, t5) {
          if (n2 = (255 & t5.rgba) / 255, 1 === n2) return { css: t5.css, rgba: t5.rgba };
          const a2 = t5.rgba >> 24 & 255, h2 = t5.rgba >> 16 & 255, c2 = t5.rgba >> 8 & 255, l3 = e4.rgba >> 24 & 255, d2 = e4.rgba >> 16 & 255, _2 = e4.rgba >> 8 & 255;
          return i2 = l3 + Math.round((a2 - l3) * n2), s2 = d2 + Math.round((h2 - d2) * n2), r2 = _2 + Math.round((c2 - _2) * n2), { css: o.toCss(i2, s2, r2), rgba: o.toRgba(i2, s2, r2) };
        }, e3.isOpaque = function(e4) {
          return 255 == (255 & e4.rgba);
        }, e3.ensureContrastRatio = function(e4, t5, i3) {
          const s3 = l2.ensureContrastRatio(e4.rgba, t5.rgba, i3);
          if (s3) return o.toColor(s3 >> 24 & 255, s3 >> 16 & 255, s3 >> 8 & 255);
        }, e3.opaque = function(e4) {
          const t5 = (255 | e4.rgba) >>> 0;
          return [i2, s2, r2] = l2.toChannels(t5), { css: o.toCss(i2, s2, r2), rgba: t5 };
        }, e3.opacity = t4, e3.multiplyOpacity = function(e4, i3) {
          return n2 = 255 & e4.rgba, t4(e4, n2 * i3 / 255);
        }, e3.toColorRGB = function(e4) {
          return [e4.rgba >> 24 & 255, e4.rgba >> 16 & 255, e4.rgba >> 8 & 255];
        };
      }(a || (t3.color = a = {})), function(e3) {
        let t4, a2;
        try {
          const e4 = document.createElement("canvas");
          e4.width = 1, e4.height = 1;
          const i3 = e4.getContext("2d", { willReadFrequently: true });
          i3 && (t4 = i3, t4.globalCompositeOperation = "copy", a2 = t4.createLinearGradient(0, 0, 1, 1));
        } catch {
        }
        e3.toColor = function(e4) {
          if (e4.match(/#[\da-f]{3,8}/i)) switch (e4.length) {
            case 4:
              return i2 = parseInt(e4.slice(1, 2).repeat(2), 16), s2 = parseInt(e4.slice(2, 3).repeat(2), 16), r2 = parseInt(e4.slice(3, 4).repeat(2), 16), o.toColor(i2, s2, r2);
            case 5:
              return i2 = parseInt(e4.slice(1, 2).repeat(2), 16), s2 = parseInt(e4.slice(2, 3).repeat(2), 16), r2 = parseInt(e4.slice(3, 4).repeat(2), 16), n2 = parseInt(e4.slice(4, 5).repeat(2), 16), o.toColor(i2, s2, r2, n2);
            case 7:
              return { css: e4, rgba: (parseInt(e4.slice(1), 16) << 8 | 255) >>> 0 };
            case 9:
              return { css: e4, rgba: parseInt(e4.slice(1), 16) >>> 0 };
          }
          const h2 = e4.match(/rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*(,\s*(0|1|\d?\.(\d+))\s*)?\)/);
          if (h2) return i2 = parseInt(h2[1]), s2 = parseInt(h2[2]), r2 = parseInt(h2[3]), n2 = Math.round(255 * (void 0 === h2[5] ? 1 : parseFloat(h2[5]))), o.toColor(i2, s2, r2, n2);
          if (!t4 || !a2) throw new Error("css.toColor: Unsupported css format");
          if (t4.fillStyle = a2, t4.fillStyle = e4, "string" != typeof t4.fillStyle) throw new Error("css.toColor: Unsupported css format");
          if (t4.fillRect(0, 0, 1, 1), [i2, s2, r2, n2] = t4.getImageData(0, 0, 1, 1).data, 255 !== n2) throw new Error("css.toColor: Unsupported css format");
          return { rgba: o.toRgba(i2, s2, r2, n2), css: e4 };
        };
      }(h || (t3.css = h = {})), function(e3) {
        function t4(e4, t5, i3) {
          const s3 = e4 / 255, r3 = t5 / 255, n3 = i3 / 255;
          return 0.2126 * (s3 <= 0.03928 ? s3 / 12.92 : Math.pow((s3 + 0.055) / 1.055, 2.4)) + 0.7152 * (r3 <= 0.03928 ? r3 / 12.92 : Math.pow((r3 + 0.055) / 1.055, 2.4)) + 0.0722 * (n3 <= 0.03928 ? n3 / 12.92 : Math.pow((n3 + 0.055) / 1.055, 2.4));
        }
        e3.relativeLuminance = function(e4) {
          return t4(e4 >> 16 & 255, e4 >> 8 & 255, 255 & e4);
        }, e3.relativeLuminance2 = t4;
      }(c || (t3.rgb = c = {})), function(e3) {
        function t4(e4, t5, i3) {
          const s3 = e4 >> 24 & 255, r3 = e4 >> 16 & 255, n3 = e4 >> 8 & 255;
          let o2 = t5 >> 24 & 255, a3 = t5 >> 16 & 255, h2 = t5 >> 8 & 255, l3 = _(c.relativeLuminance2(o2, a3, h2), c.relativeLuminance2(s3, r3, n3));
          for (; l3 < i3 && (o2 > 0 || a3 > 0 || h2 > 0); ) o2 -= Math.max(0, Math.ceil(0.1 * o2)), a3 -= Math.max(0, Math.ceil(0.1 * a3)), h2 -= Math.max(0, Math.ceil(0.1 * h2)), l3 = _(c.relativeLuminance2(o2, a3, h2), c.relativeLuminance2(s3, r3, n3));
          return (o2 << 24 | a3 << 16 | h2 << 8 | 255) >>> 0;
        }
        function a2(e4, t5, i3) {
          const s3 = e4 >> 24 & 255, r3 = e4 >> 16 & 255, n3 = e4 >> 8 & 255;
          let o2 = t5 >> 24 & 255, a3 = t5 >> 16 & 255, h2 = t5 >> 8 & 255, l3 = _(c.relativeLuminance2(o2, a3, h2), c.relativeLuminance2(s3, r3, n3));
          for (; l3 < i3 && (o2 < 255 || a3 < 255 || h2 < 255); ) o2 = Math.min(255, o2 + Math.ceil(0.1 * (255 - o2))), a3 = Math.min(255, a3 + Math.ceil(0.1 * (255 - a3))), h2 = Math.min(255, h2 + Math.ceil(0.1 * (255 - h2))), l3 = _(c.relativeLuminance2(o2, a3, h2), c.relativeLuminance2(s3, r3, n3));
          return (o2 << 24 | a3 << 16 | h2 << 8 | 255) >>> 0;
        }
        e3.blend = function(e4, t5) {
          if (n2 = (255 & t5) / 255, 1 === n2) return t5;
          const a3 = t5 >> 24 & 255, h2 = t5 >> 16 & 255, c2 = t5 >> 8 & 255, l3 = e4 >> 24 & 255, d2 = e4 >> 16 & 255, _2 = e4 >> 8 & 255;
          return i2 = l3 + Math.round((a3 - l3) * n2), s2 = d2 + Math.round((h2 - d2) * n2), r2 = _2 + Math.round((c2 - _2) * n2), o.toRgba(i2, s2, r2);
        }, e3.ensureContrastRatio = function(e4, i3, s3) {
          const r3 = c.relativeLuminance(e4 >> 8), n3 = c.relativeLuminance(i3 >> 8);
          if (_(r3, n3) < s3) {
            if (n3 < r3) {
              const n4 = t4(e4, i3, s3), o3 = _(r3, c.relativeLuminance(n4 >> 8));
              if (o3 < s3) {
                const t5 = a2(e4, i3, s3);
                return o3 > _(r3, c.relativeLuminance(t5 >> 8)) ? n4 : t5;
              }
              return n4;
            }
            const o2 = a2(e4, i3, s3), h2 = _(r3, c.relativeLuminance(o2 >> 8));
            if (h2 < s3) {
              const n4 = t4(e4, i3, s3);
              return h2 > _(r3, c.relativeLuminance(n4 >> 8)) ? o2 : n4;
            }
            return o2;
          }
        }, e3.reduceLuminance = t4, e3.increaseLuminance = a2, e3.toChannels = function(e4) {
          return [e4 >> 24 & 255, e4 >> 16 & 255, e4 >> 8 & 255, 255 & e4];
        };
      }(l2 || (t3.rgba = l2 = {})), t3.toPaddedHex = d, t3.contrastRatio = _;
    }, 8969: (e2, t3, i2) => {
      Object.defineProperty(t3, "__esModule", { value: true }), t3.CoreTerminal = void 0;
      const s2 = i2(844), r2 = i2(2585), n2 = i2(4348), o = i2(7866), a = i2(744), h = i2(7302), c = i2(6975), l2 = i2(8460), d = i2(1753), _ = i2(1480), u2 = i2(7994), f2 = i2(9282), v2 = i2(5435), p2 = i2(5981), g = i2(2660);
      let m2 = false;
      class S2 extends s2.Disposable {
        get onScroll() {
          return this._onScrollApi || (this._onScrollApi = this.register(new l2.EventEmitter()), this._onScroll.event((e3) => {
            this._onScrollApi?.fire(e3.position);
          })), this._onScrollApi.event;
        }
        get cols() {
          return this._bufferService.cols;
        }
        get rows() {
          return this._bufferService.rows;
        }
        get buffers() {
          return this._bufferService.buffers;
        }
        get options() {
          return this.optionsService.options;
        }
        set options(e3) {
          for (const t4 in e3) this.optionsService.options[t4] = e3[t4];
        }
        constructor(e3) {
          super(), this._windowsWrappingHeuristics = this.register(new s2.MutableDisposable()), this._onBinary = this.register(new l2.EventEmitter()), this.onBinary = this._onBinary.event, this._onData = this.register(new l2.EventEmitter()), this.onData = this._onData.event, this._onLineFeed = this.register(new l2.EventEmitter()), this.onLineFeed = this._onLineFeed.event, this._onResize = this.register(new l2.EventEmitter()), this.onResize = this._onResize.event, this._onWriteParsed = this.register(new l2.EventEmitter()), this.onWriteParsed = this._onWriteParsed.event, this._onScroll = this.register(new l2.EventEmitter()), this._instantiationService = new n2.InstantiationService(), this.optionsService = this.register(new h.OptionsService(e3)), this._instantiationService.setService(r2.IOptionsService, this.optionsService), this._bufferService = this.register(this._instantiationService.createInstance(a.BufferService)), this._instantiationService.setService(r2.IBufferService, this._bufferService), this._logService = this.register(this._instantiationService.createInstance(o.LogService)), this._instantiationService.setService(r2.ILogService, this._logService), this.coreService = this.register(this._instantiationService.createInstance(c.CoreService)), this._instantiationService.setService(r2.ICoreService, this.coreService), this.coreMouseService = this.register(this._instantiationService.createInstance(d.CoreMouseService)), this._instantiationService.setService(r2.ICoreMouseService, this.coreMouseService), this.unicodeService = this.register(this._instantiationService.createInstance(_.UnicodeService)), this._instantiationService.setService(r2.IUnicodeService, this.unicodeService), this._charsetService = this._instantiationService.createInstance(u2.CharsetService), this._instantiationService.setService(r2.ICharsetService, this._charsetService), this._oscLinkService = this._instantiationService.createInstance(g.OscLinkService), this._instantiationService.setService(r2.IOscLinkService, this._oscLinkService), this._inputHandler = this.register(new v2.InputHandler(this._bufferService, this._charsetService, this.coreService, this._logService, this.optionsService, this._oscLinkService, this.coreMouseService, this.unicodeService)), this.register((0, l2.forwardEvent)(this._inputHandler.onLineFeed, this._onLineFeed)), this.register(this._inputHandler), this.register((0, l2.forwardEvent)(this._bufferService.onResize, this._onResize)), this.register((0, l2.forwardEvent)(this.coreService.onData, this._onData)), this.register((0, l2.forwardEvent)(this.coreService.onBinary, this._onBinary)), this.register(this.coreService.onRequestScrollToBottom(() => this.scrollToBottom())), this.register(this.coreService.onUserInput(() => this._writeBuffer.handleUserInput())), this.register(this.optionsService.onMultipleOptionChange(["windowsMode", "windowsPty"], () => this._handleWindowsPtyOptionChange())), this.register(this._bufferService.onScroll((e4) => {
            this._onScroll.fire({ position: this._bufferService.buffer.ydisp, source: 0 }), this._inputHandler.markRangeDirty(this._bufferService.buffer.scrollTop, this._bufferService.buffer.scrollBottom);
          })), this.register(this._inputHandler.onScroll((e4) => {
            this._onScroll.fire({ position: this._bufferService.buffer.ydisp, source: 0 }), this._inputHandler.markRangeDirty(this._bufferService.buffer.scrollTop, this._bufferService.buffer.scrollBottom);
          })), this._writeBuffer = this.register(new p2.WriteBuffer((e4, t4) => this._inputHandler.parse(e4, t4))), this.register((0, l2.forwardEvent)(this._writeBuffer.onWriteParsed, this._onWriteParsed));
        }
        write(e3, t4) {
          this._writeBuffer.write(e3, t4);
        }
        writeSync(e3, t4) {
          this._logService.logLevel <= r2.LogLevelEnum.WARN && !m2 && (this._logService.warn("writeSync is unreliable and will be removed soon."), m2 = true), this._writeBuffer.writeSync(e3, t4);
        }
        input(e3, t4 = true) {
          this.coreService.triggerDataEvent(e3, t4);
        }
        resize(e3, t4) {
          isNaN(e3) || isNaN(t4) || (e3 = Math.max(e3, a.MINIMUM_COLS), t4 = Math.max(t4, a.MINIMUM_ROWS), this._bufferService.resize(e3, t4));
        }
        scroll(e3, t4 = false) {
          this._bufferService.scroll(e3, t4);
        }
        scrollLines(e3, t4, i3) {
          this._bufferService.scrollLines(e3, t4, i3);
        }
        scrollPages(e3) {
          this.scrollLines(e3 * (this.rows - 1));
        }
        scrollToTop() {
          this.scrollLines(-this._bufferService.buffer.ydisp);
        }
        scrollToBottom() {
          this.scrollLines(this._bufferService.buffer.ybase - this._bufferService.buffer.ydisp);
        }
        scrollToLine(e3) {
          const t4 = e3 - this._bufferService.buffer.ydisp;
          0 !== t4 && this.scrollLines(t4);
        }
        registerEscHandler(e3, t4) {
          return this._inputHandler.registerEscHandler(e3, t4);
        }
        registerDcsHandler(e3, t4) {
          return this._inputHandler.registerDcsHandler(e3, t4);
        }
        registerCsiHandler(e3, t4) {
          return this._inputHandler.registerCsiHandler(e3, t4);
        }
        registerOscHandler(e3, t4) {
          return this._inputHandler.registerOscHandler(e3, t4);
        }
        _setup() {
          this._handleWindowsPtyOptionChange();
        }
        reset() {
          this._inputHandler.reset(), this._bufferService.reset(), this._charsetService.reset(), this.coreService.reset(), this.coreMouseService.reset();
        }
        _handleWindowsPtyOptionChange() {
          let e3 = false;
          const t4 = this.optionsService.rawOptions.windowsPty;
          t4 && void 0 !== t4.buildNumber && void 0 !== t4.buildNumber ? e3 = !!("conpty" === t4.backend && t4.buildNumber < 21376) : this.optionsService.rawOptions.windowsMode && (e3 = true), e3 ? this._enableWindowsWrappingHeuristics() : this._windowsWrappingHeuristics.clear();
        }
        _enableWindowsWrappingHeuristics() {
          if (!this._windowsWrappingHeuristics.value) {
            const e3 = [];
            e3.push(this.onLineFeed(f2.updateWindowsModeWrappedState.bind(null, this._bufferService))), e3.push(this.registerCsiHandler({ final: "H" }, () => ((0, f2.updateWindowsModeWrappedState)(this._bufferService), false))), this._windowsWrappingHeuristics.value = (0, s2.toDisposable)(() => {
              for (const t4 of e3) t4.dispose();
            });
          }
        }
      }
      t3.CoreTerminal = S2;
    }, 8460: (e2, t3) => {
      Object.defineProperty(t3, "__esModule", { value: true }), t3.runAndSubscribe = t3.forwardEvent = t3.EventEmitter = void 0, t3.EventEmitter = class {
        constructor() {
          this._listeners = [], this._disposed = false;
        }
        get event() {
          return this._event || (this._event = (e3) => (this._listeners.push(e3), { dispose: () => {
            if (!this._disposed) {
              for (let t4 = 0; t4 < this._listeners.length; t4++) if (this._listeners[t4] === e3) return void this._listeners.splice(t4, 1);
            }
          } })), this._event;
        }
        fire(e3, t4) {
          const i2 = [];
          for (let e4 = 0; e4 < this._listeners.length; e4++) i2.push(this._listeners[e4]);
          for (let s2 = 0; s2 < i2.length; s2++) i2[s2].call(void 0, e3, t4);
        }
        dispose() {
          this.clearListeners(), this._disposed = true;
        }
        clearListeners() {
          this._listeners && (this._listeners.length = 0);
        }
      }, t3.forwardEvent = function(e3, t4) {
        return e3((e4) => t4.fire(e4));
      }, t3.runAndSubscribe = function(e3, t4) {
        return t4(void 0), e3((e4) => t4(e4));
      };
    }, 5435: function(e2, t3, i2) {
      var s2 = this && this.__decorate || function(e3, t4, i3, s3) {
        var r3, n3 = arguments.length, o2 = n3 < 3 ? t4 : null === s3 ? s3 = Object.getOwnPropertyDescriptor(t4, i3) : s3;
        if ("object" == typeof Reflect && "function" == typeof Reflect.decorate) o2 = Reflect.decorate(e3, t4, i3, s3);
        else for (var a2 = e3.length - 1; a2 >= 0; a2--) (r3 = e3[a2]) && (o2 = (n3 < 3 ? r3(o2) : n3 > 3 ? r3(t4, i3, o2) : r3(t4, i3)) || o2);
        return n3 > 3 && o2 && Object.defineProperty(t4, i3, o2), o2;
      }, r2 = this && this.__param || function(e3, t4) {
        return function(i3, s3) {
          t4(i3, s3, e3);
        };
      };
      Object.defineProperty(t3, "__esModule", { value: true }), t3.InputHandler = t3.WindowsOptionsReportType = void 0;
      const n2 = i2(2584), o = i2(7116), a = i2(2015), h = i2(844), c = i2(482), l2 = i2(8437), d = i2(8460), _ = i2(643), u2 = i2(511), f2 = i2(3734), v2 = i2(2585), p2 = i2(1480), g = i2(6242), m2 = i2(6351), S2 = i2(5941), C2 = { "(": 0, ")": 1, "*": 2, "+": 3, "-": 1, ".": 2 }, b = 131072;
      function w2(e3, t4) {
        if (e3 > 24) return t4.setWinLines || false;
        switch (e3) {
          case 1:
            return !!t4.restoreWin;
          case 2:
            return !!t4.minimizeWin;
          case 3:
            return !!t4.setWinPosition;
          case 4:
            return !!t4.setWinSizePixels;
          case 5:
            return !!t4.raiseWin;
          case 6:
            return !!t4.lowerWin;
          case 7:
            return !!t4.refreshWin;
          case 8:
            return !!t4.setWinSizeChars;
          case 9:
            return !!t4.maximizeWin;
          case 10:
            return !!t4.fullscreenWin;
          case 11:
            return !!t4.getWinState;
          case 13:
            return !!t4.getWinPosition;
          case 14:
            return !!t4.getWinSizePixels;
          case 15:
            return !!t4.getScreenSizePixels;
          case 16:
            return !!t4.getCellSizePixels;
          case 18:
            return !!t4.getWinSizeChars;
          case 19:
            return !!t4.getScreenSizeChars;
          case 20:
            return !!t4.getIconTitle;
          case 21:
            return !!t4.getWinTitle;
          case 22:
            return !!t4.pushTitle;
          case 23:
            return !!t4.popTitle;
          case 24:
            return !!t4.setWinLines;
        }
        return false;
      }
      var y2;
      !function(e3) {
        e3[e3.GET_WIN_SIZE_PIXELS = 0] = "GET_WIN_SIZE_PIXELS", e3[e3.GET_CELL_SIZE_PIXELS = 1] = "GET_CELL_SIZE_PIXELS";
      }(y2 || (t3.WindowsOptionsReportType = y2 = {}));
      let E2 = 0;
      class k2 extends h.Disposable {
        getAttrData() {
          return this._curAttrData;
        }
        constructor(e3, t4, i3, s3, r3, h2, _2, f3, v3 = new a.EscapeSequenceParser()) {
          super(), this._bufferService = e3, this._charsetService = t4, this._coreService = i3, this._logService = s3, this._optionsService = r3, this._oscLinkService = h2, this._coreMouseService = _2, this._unicodeService = f3, this._parser = v3, this._parseBuffer = new Uint32Array(4096), this._stringDecoder = new c.StringToUtf32(), this._utf8Decoder = new c.Utf8ToUtf32(), this._workCell = new u2.CellData(), this._windowTitle = "", this._iconName = "", this._windowTitleStack = [], this._iconNameStack = [], this._curAttrData = l2.DEFAULT_ATTR_DATA.clone(), this._eraseAttrDataInternal = l2.DEFAULT_ATTR_DATA.clone(), this._onRequestBell = this.register(new d.EventEmitter()), this.onRequestBell = this._onRequestBell.event, this._onRequestRefreshRows = this.register(new d.EventEmitter()), this.onRequestRefreshRows = this._onRequestRefreshRows.event, this._onRequestReset = this.register(new d.EventEmitter()), this.onRequestReset = this._onRequestReset.event, this._onRequestSendFocus = this.register(new d.EventEmitter()), this.onRequestSendFocus = this._onRequestSendFocus.event, this._onRequestSyncScrollBar = this.register(new d.EventEmitter()), this.onRequestSyncScrollBar = this._onRequestSyncScrollBar.event, this._onRequestWindowsOptionsReport = this.register(new d.EventEmitter()), this.onRequestWindowsOptionsReport = this._onRequestWindowsOptionsReport.event, this._onA11yChar = this.register(new d.EventEmitter()), this.onA11yChar = this._onA11yChar.event, this._onA11yTab = this.register(new d.EventEmitter()), this.onA11yTab = this._onA11yTab.event, this._onCursorMove = this.register(new d.EventEmitter()), this.onCursorMove = this._onCursorMove.event, this._onLineFeed = this.register(new d.EventEmitter()), this.onLineFeed = this._onLineFeed.event, this._onScroll = this.register(new d.EventEmitter()), this.onScroll = this._onScroll.event, this._onTitleChange = this.register(new d.EventEmitter()), this.onTitleChange = this._onTitleChange.event, this._onColor = this.register(new d.EventEmitter()), this.onColor = this._onColor.event, this._parseStack = { paused: false, cursorStartX: 0, cursorStartY: 0, decodedLength: 0, position: 0 }, this._specialColors = [256, 257, 258], this.register(this._parser), this._dirtyRowTracker = new L2(this._bufferService), this._activeBuffer = this._bufferService.buffer, this.register(this._bufferService.buffers.onBufferActivate((e4) => this._activeBuffer = e4.activeBuffer)), this._parser.setCsiHandlerFallback((e4, t5) => {
            this._logService.debug("Unknown CSI code: ", { identifier: this._parser.identToString(e4), params: t5.toArray() });
          }), this._parser.setEscHandlerFallback((e4) => {
            this._logService.debug("Unknown ESC code: ", { identifier: this._parser.identToString(e4) });
          }), this._parser.setExecuteHandlerFallback((e4) => {
            this._logService.debug("Unknown EXECUTE code: ", { code: e4 });
          }), this._parser.setOscHandlerFallback((e4, t5, i4) => {
            this._logService.debug("Unknown OSC code: ", { identifier: e4, action: t5, data: i4 });
          }), this._parser.setDcsHandlerFallback((e4, t5, i4) => {
            "HOOK" === t5 && (i4 = i4.toArray()), this._logService.debug("Unknown DCS code: ", { identifier: this._parser.identToString(e4), action: t5, payload: i4 });
          }), this._parser.setPrintHandler((e4, t5, i4) => this.print(e4, t5, i4)), this._parser.registerCsiHandler({ final: "@" }, (e4) => this.insertChars(e4)), this._parser.registerCsiHandler({ intermediates: " ", final: "@" }, (e4) => this.scrollLeft(e4)), this._parser.registerCsiHandler({ final: "A" }, (e4) => this.cursorUp(e4)), this._parser.registerCsiHandler({ intermediates: " ", final: "A" }, (e4) => this.scrollRight(e4)), this._parser.registerCsiHandler({ final: "B" }, (e4) => this.cursorDown(e4)), this._parser.registerCsiHandler({ final: "C" }, (e4) => this.cursorForward(e4)), this._parser.registerCsiHandler({ final: "D" }, (e4) => this.cursorBackward(e4)), this._parser.registerCsiHandler({ final: "E" }, (e4) => this.cursorNextLine(e4)), this._parser.registerCsiHandler({ final: "F" }, (e4) => this.cursorPrecedingLine(e4)), this._parser.registerCsiHandler({ final: "G" }, (e4) => this.cursorCharAbsolute(e4)), this._parser.registerCsiHandler({ final: "H" }, (e4) => this.cursorPosition(e4)), this._parser.registerCsiHandler({ final: "I" }, (e4) => this.cursorForwardTab(e4)), this._parser.registerCsiHandler({ final: "J" }, (e4) => this.eraseInDisplay(e4, false)), this._parser.registerCsiHandler({ prefix: "?", final: "J" }, (e4) => this.eraseInDisplay(e4, true)), this._parser.registerCsiHandler({ final: "K" }, (e4) => this.eraseInLine(e4, false)), this._parser.registerCsiHandler({ prefix: "?", final: "K" }, (e4) => this.eraseInLine(e4, true)), this._parser.registerCsiHandler({ final: "L" }, (e4) => this.insertLines(e4)), this._parser.registerCsiHandler({ final: "M" }, (e4) => this.deleteLines(e4)), this._parser.registerCsiHandler({ final: "P" }, (e4) => this.deleteChars(e4)), this._parser.registerCsiHandler({ final: "S" }, (e4) => this.scrollUp(e4)), this._parser.registerCsiHandler({ final: "T" }, (e4) => this.scrollDown(e4)), this._parser.registerCsiHandler({ final: "X" }, (e4) => this.eraseChars(e4)), this._parser.registerCsiHandler({ final: "Z" }, (e4) => this.cursorBackwardTab(e4)), this._parser.registerCsiHandler({ final: "`" }, (e4) => this.charPosAbsolute(e4)), this._parser.registerCsiHandler({ final: "a" }, (e4) => this.hPositionRelative(e4)), this._parser.registerCsiHandler({ final: "b" }, (e4) => this.repeatPrecedingCharacter(e4)), this._parser.registerCsiHandler({ final: "c" }, (e4) => this.sendDeviceAttributesPrimary(e4)), this._parser.registerCsiHandler({ prefix: ">", final: "c" }, (e4) => this.sendDeviceAttributesSecondary(e4)), this._parser.registerCsiHandler({ final: "d" }, (e4) => this.linePosAbsolute(e4)), this._parser.registerCsiHandler({ final: "e" }, (e4) => this.vPositionRelative(e4)), this._parser.registerCsiHandler({ final: "f" }, (e4) => this.hVPosition(e4)), this._parser.registerCsiHandler({ final: "g" }, (e4) => this.tabClear(e4)), this._parser.registerCsiHandler({ final: "h" }, (e4) => this.setMode(e4)), this._parser.registerCsiHandler({ prefix: "?", final: "h" }, (e4) => this.setModePrivate(e4)), this._parser.registerCsiHandler({ final: "l" }, (e4) => this.resetMode(e4)), this._parser.registerCsiHandler({ prefix: "?", final: "l" }, (e4) => this.resetModePrivate(e4)), this._parser.registerCsiHandler({ final: "m" }, (e4) => this.charAttributes(e4)), this._parser.registerCsiHandler({ final: "n" }, (e4) => this.deviceStatus(e4)), this._parser.registerCsiHandler({ prefix: "?", final: "n" }, (e4) => this.deviceStatusPrivate(e4)), this._parser.registerCsiHandler({ intermediates: "!", final: "p" }, (e4) => this.softReset(e4)), this._parser.registerCsiHandler({ intermediates: " ", final: "q" }, (e4) => this.setCursorStyle(e4)), this._parser.registerCsiHandler({ final: "r" }, (e4) => this.setScrollRegion(e4)), this._parser.registerCsiHandler({ final: "s" }, (e4) => this.saveCursor(e4)), this._parser.registerCsiHandler({ final: "t" }, (e4) => this.windowOptions(e4)), this._parser.registerCsiHandler({ final: "u" }, (e4) => this.restoreCursor(e4)), this._parser.registerCsiHandler({ intermediates: "'", final: "}" }, (e4) => this.insertColumns(e4)), this._parser.registerCsiHandler({ intermediates: "'", final: "~" }, (e4) => this.deleteColumns(e4)), this._parser.registerCsiHandler({ intermediates: '"', final: "q" }, (e4) => this.selectProtected(e4)), this._parser.registerCsiHandler({ intermediates: "$", final: "p" }, (e4) => this.requestMode(e4, true)), this._parser.registerCsiHandler({ prefix: "?", intermediates: "$", final: "p" }, (e4) => this.requestMode(e4, false)), this._parser.setExecuteHandler(n2.C0.BEL, () => this.bell()), this._parser.setExecuteHandler(n2.C0.LF, () => this.lineFeed()), this._parser.setExecuteHandler(n2.C0.VT, () => this.lineFeed()), this._parser.setExecuteHandler(n2.C0.FF, () => this.lineFeed()), this._parser.setExecuteHandler(n2.C0.CR, () => this.carriageReturn()), this._parser.setExecuteHandler(n2.C0.BS, () => this.backspace()), this._parser.setExecuteHandler(n2.C0.HT, () => this.tab()), this._parser.setExecuteHandler(n2.C0.SO, () => this.shiftOut()), this._parser.setExecuteHandler(n2.C0.SI, () => this.shiftIn()), this._parser.setExecuteHandler(n2.C1.IND, () => this.index()), this._parser.setExecuteHandler(n2.C1.NEL, () => this.nextLine()), this._parser.setExecuteHandler(n2.C1.HTS, () => this.tabSet()), this._parser.registerOscHandler(0, new g.OscHandler((e4) => (this.setTitle(e4), this.setIconName(e4), true))), this._parser.registerOscHandler(1, new g.OscHandler((e4) => this.setIconName(e4))), this._parser.registerOscHandler(2, new g.OscHandler((e4) => this.setTitle(e4))), this._parser.registerOscHandler(4, new g.OscHandler((e4) => this.setOrReportIndexedColor(e4))), this._parser.registerOscHandler(8, new g.OscHandler((e4) => this.setHyperlink(e4))), this._parser.registerOscHandler(10, new g.OscHandler((e4) => this.setOrReportFgColor(e4))), this._parser.registerOscHandler(11, new g.OscHandler((e4) => this.setOrReportBgColor(e4))), this._parser.registerOscHandler(12, new g.OscHandler((e4) => this.setOrReportCursorColor(e4))), this._parser.registerOscHandler(104, new g.OscHandler((e4) => this.restoreIndexedColor(e4))), this._parser.registerOscHandler(110, new g.OscHandler((e4) => this.restoreFgColor(e4))), this._parser.registerOscHandler(111, new g.OscHandler((e4) => this.restoreBgColor(e4))), this._parser.registerOscHandler(112, new g.OscHandler((e4) => this.restoreCursorColor(e4))), this._parser.registerEscHandler({ final: "7" }, () => this.saveCursor()), this._parser.registerEscHandler({ final: "8" }, () => this.restoreCursor()), this._parser.registerEscHandler({ final: "D" }, () => this.index()), this._parser.registerEscHandler({ final: "E" }, () => this.nextLine()), this._parser.registerEscHandler({ final: "H" }, () => this.tabSet()), this._parser.registerEscHandler({ final: "M" }, () => this.reverseIndex()), this._parser.registerEscHandler({ final: "=" }, () => this.keypadApplicationMode()), this._parser.registerEscHandler({ final: ">" }, () => this.keypadNumericMode()), this._parser.registerEscHandler({ final: "c" }, () => this.fullReset()), this._parser.registerEscHandler({ final: "n" }, () => this.setgLevel(2)), this._parser.registerEscHandler({ final: "o" }, () => this.setgLevel(3)), this._parser.registerEscHandler({ final: "|" }, () => this.setgLevel(3)), this._parser.registerEscHandler({ final: "}" }, () => this.setgLevel(2)), this._parser.registerEscHandler({ final: "~" }, () => this.setgLevel(1)), this._parser.registerEscHandler({ intermediates: "%", final: "@" }, () => this.selectDefaultCharset()), this._parser.registerEscHandler({ intermediates: "%", final: "G" }, () => this.selectDefaultCharset());
          for (const e4 in o.CHARSETS) this._parser.registerEscHandler({ intermediates: "(", final: e4 }, () => this.selectCharset("(" + e4)), this._parser.registerEscHandler({ intermediates: ")", final: e4 }, () => this.selectCharset(")" + e4)), this._parser.registerEscHandler({ intermediates: "*", final: e4 }, () => this.selectCharset("*" + e4)), this._parser.registerEscHandler({ intermediates: "+", final: e4 }, () => this.selectCharset("+" + e4)), this._parser.registerEscHandler({ intermediates: "-", final: e4 }, () => this.selectCharset("-" + e4)), this._parser.registerEscHandler({ intermediates: ".", final: e4 }, () => this.selectCharset("." + e4)), this._parser.registerEscHandler({ intermediates: "/", final: e4 }, () => this.selectCharset("/" + e4));
          this._parser.registerEscHandler({ intermediates: "#", final: "8" }, () => this.screenAlignmentPattern()), this._parser.setErrorHandler((e4) => (this._logService.error("Parsing error: ", e4), e4)), this._parser.registerDcsHandler({ intermediates: "$", final: "q" }, new m2.DcsHandler((e4, t5) => this.requestStatusString(e4, t5)));
        }
        _preserveStack(e3, t4, i3, s3) {
          this._parseStack.paused = true, this._parseStack.cursorStartX = e3, this._parseStack.cursorStartY = t4, this._parseStack.decodedLength = i3, this._parseStack.position = s3;
        }
        _logSlowResolvingAsync(e3) {
          this._logService.logLevel <= v2.LogLevelEnum.WARN && Promise.race([e3, new Promise((e4, t4) => setTimeout(() => t4("#SLOW_TIMEOUT"), 5e3))]).catch((e4) => {
            if ("#SLOW_TIMEOUT" !== e4) throw e4;
            console.warn("async parser handler taking longer than 5000 ms");
          });
        }
        _getCurrentLinkId() {
          return this._curAttrData.extended.urlId;
        }
        parse(e3, t4) {
          let i3, s3 = this._activeBuffer.x, r3 = this._activeBuffer.y, n3 = 0;
          const o2 = this._parseStack.paused;
          if (o2) {
            if (i3 = this._parser.parse(this._parseBuffer, this._parseStack.decodedLength, t4)) return this._logSlowResolvingAsync(i3), i3;
            s3 = this._parseStack.cursorStartX, r3 = this._parseStack.cursorStartY, this._parseStack.paused = false, e3.length > b && (n3 = this._parseStack.position + b);
          }
          if (this._logService.logLevel <= v2.LogLevelEnum.DEBUG && this._logService.debug("parsing data" + ("string" == typeof e3 ? ` "${e3}"` : ` "${Array.prototype.map.call(e3, (e4) => String.fromCharCode(e4)).join("")}"`), "string" == typeof e3 ? e3.split("").map((e4) => e4.charCodeAt(0)) : e3), this._parseBuffer.length < e3.length && this._parseBuffer.length < b && (this._parseBuffer = new Uint32Array(Math.min(e3.length, b))), o2 || this._dirtyRowTracker.clearRange(), e3.length > b) for (let t5 = n3; t5 < e3.length; t5 += b) {
            const n4 = t5 + b < e3.length ? t5 + b : e3.length, o3 = "string" == typeof e3 ? this._stringDecoder.decode(e3.substring(t5, n4), this._parseBuffer) : this._utf8Decoder.decode(e3.subarray(t5, n4), this._parseBuffer);
            if (i3 = this._parser.parse(this._parseBuffer, o3)) return this._preserveStack(s3, r3, o3, t5), this._logSlowResolvingAsync(i3), i3;
          }
          else if (!o2) {
            const t5 = "string" == typeof e3 ? this._stringDecoder.decode(e3, this._parseBuffer) : this._utf8Decoder.decode(e3, this._parseBuffer);
            if (i3 = this._parser.parse(this._parseBuffer, t5)) return this._preserveStack(s3, r3, t5, 0), this._logSlowResolvingAsync(i3), i3;
          }
          this._activeBuffer.x === s3 && this._activeBuffer.y === r3 || this._onCursorMove.fire();
          const a2 = this._dirtyRowTracker.end + (this._bufferService.buffer.ybase - this._bufferService.buffer.ydisp), h2 = this._dirtyRowTracker.start + (this._bufferService.buffer.ybase - this._bufferService.buffer.ydisp);
          h2 < this._bufferService.rows && this._onRequestRefreshRows.fire(Math.min(h2, this._bufferService.rows - 1), Math.min(a2, this._bufferService.rows - 1));
        }
        print(e3, t4, i3) {
          let s3, r3;
          const n3 = this._charsetService.charset, o2 = this._optionsService.rawOptions.screenReaderMode, a2 = this._bufferService.cols, h2 = this._coreService.decPrivateModes.wraparound, d2 = this._coreService.modes.insertMode, u3 = this._curAttrData;
          let f3 = this._activeBuffer.lines.get(this._activeBuffer.ybase + this._activeBuffer.y);
          this._dirtyRowTracker.markDirty(this._activeBuffer.y), this._activeBuffer.x && i3 - t4 > 0 && 2 === f3.getWidth(this._activeBuffer.x - 1) && f3.setCellFromCodepoint(this._activeBuffer.x - 1, 0, 1, u3);
          let v3 = this._parser.precedingJoinState;
          for (let g2 = t4; g2 < i3; ++g2) {
            if (s3 = e3[g2], s3 < 127 && n3) {
              const e4 = n3[String.fromCharCode(s3)];
              e4 && (s3 = e4.charCodeAt(0));
            }
            const t5 = this._unicodeService.charProperties(s3, v3);
            r3 = p2.UnicodeService.extractWidth(t5);
            const i4 = p2.UnicodeService.extractShouldJoin(t5), m3 = i4 ? p2.UnicodeService.extractWidth(v3) : 0;
            if (v3 = t5, o2 && this._onA11yChar.fire((0, c.stringFromCodePoint)(s3)), this._getCurrentLinkId() && this._oscLinkService.addLineToLink(this._getCurrentLinkId(), this._activeBuffer.ybase + this._activeBuffer.y), this._activeBuffer.x + r3 - m3 > a2) {
              if (h2) {
                const e4 = f3;
                let t6 = this._activeBuffer.x - m3;
                for (this._activeBuffer.x = m3, this._activeBuffer.y++, this._activeBuffer.y === this._activeBuffer.scrollBottom + 1 ? (this._activeBuffer.y--, this._bufferService.scroll(this._eraseAttrData(), true)) : (this._activeBuffer.y >= this._bufferService.rows && (this._activeBuffer.y = this._bufferService.rows - 1), this._activeBuffer.lines.get(this._activeBuffer.ybase + this._activeBuffer.y).isWrapped = true), f3 = this._activeBuffer.lines.get(this._activeBuffer.ybase + this._activeBuffer.y), m3 > 0 && f3 instanceof l2.BufferLine && f3.copyCellsFrom(e4, t6, 0, m3, false); t6 < a2; ) e4.setCellFromCodepoint(t6++, 0, 1, u3);
              } else if (this._activeBuffer.x = a2 - 1, 2 === r3) continue;
            }
            if (i4 && this._activeBuffer.x) {
              const e4 = f3.getWidth(this._activeBuffer.x - 1) ? 1 : 2;
              f3.addCodepointToCell(this._activeBuffer.x - e4, s3, r3);
              for (let e5 = r3 - m3; --e5 >= 0; ) f3.setCellFromCodepoint(this._activeBuffer.x++, 0, 0, u3);
            } else if (d2 && (f3.insertCells(this._activeBuffer.x, r3 - m3, this._activeBuffer.getNullCell(u3)), 2 === f3.getWidth(a2 - 1) && f3.setCellFromCodepoint(a2 - 1, _.NULL_CELL_CODE, _.NULL_CELL_WIDTH, u3)), f3.setCellFromCodepoint(this._activeBuffer.x++, s3, r3, u3), r3 > 0) for (; --r3; ) f3.setCellFromCodepoint(this._activeBuffer.x++, 0, 0, u3);
          }
          this._parser.precedingJoinState = v3, this._activeBuffer.x < a2 && i3 - t4 > 0 && 0 === f3.getWidth(this._activeBuffer.x) && !f3.hasContent(this._activeBuffer.x) && f3.setCellFromCodepoint(this._activeBuffer.x, 0, 1, u3), this._dirtyRowTracker.markDirty(this._activeBuffer.y);
        }
        registerCsiHandler(e3, t4) {
          return "t" !== e3.final || e3.prefix || e3.intermediates ? this._parser.registerCsiHandler(e3, t4) : this._parser.registerCsiHandler(e3, (e4) => !w2(e4.params[0], this._optionsService.rawOptions.windowOptions) || t4(e4));
        }
        registerDcsHandler(e3, t4) {
          return this._parser.registerDcsHandler(e3, new m2.DcsHandler(t4));
        }
        registerEscHandler(e3, t4) {
          return this._parser.registerEscHandler(e3, t4);
        }
        registerOscHandler(e3, t4) {
          return this._parser.registerOscHandler(e3, new g.OscHandler(t4));
        }
        bell() {
          return this._onRequestBell.fire(), true;
        }
        lineFeed() {
          return this._dirtyRowTracker.markDirty(this._activeBuffer.y), this._optionsService.rawOptions.convertEol && (this._activeBuffer.x = 0), this._activeBuffer.y++, this._activeBuffer.y === this._activeBuffer.scrollBottom + 1 ? (this._activeBuffer.y--, this._bufferService.scroll(this._eraseAttrData())) : this._activeBuffer.y >= this._bufferService.rows ? this._activeBuffer.y = this._bufferService.rows - 1 : this._activeBuffer.lines.get(this._activeBuffer.ybase + this._activeBuffer.y).isWrapped = false, this._activeBuffer.x >= this._bufferService.cols && this._activeBuffer.x--, this._dirtyRowTracker.markDirty(this._activeBuffer.y), this._onLineFeed.fire(), true;
        }
        carriageReturn() {
          return this._activeBuffer.x = 0, true;
        }
        backspace() {
          if (!this._coreService.decPrivateModes.reverseWraparound) return this._restrictCursor(), this._activeBuffer.x > 0 && this._activeBuffer.x--, true;
          if (this._restrictCursor(this._bufferService.cols), this._activeBuffer.x > 0) this._activeBuffer.x--;
          else if (0 === this._activeBuffer.x && this._activeBuffer.y > this._activeBuffer.scrollTop && this._activeBuffer.y <= this._activeBuffer.scrollBottom && this._activeBuffer.lines.get(this._activeBuffer.ybase + this._activeBuffer.y)?.isWrapped) {
            this._activeBuffer.lines.get(this._activeBuffer.ybase + this._activeBuffer.y).isWrapped = false, this._activeBuffer.y--, this._activeBuffer.x = this._bufferService.cols - 1;
            const e3 = this._activeBuffer.lines.get(this._activeBuffer.ybase + this._activeBuffer.y);
            e3.hasWidth(this._activeBuffer.x) && !e3.hasContent(this._activeBuffer.x) && this._activeBuffer.x--;
          }
          return this._restrictCursor(), true;
        }
        tab() {
          if (this._activeBuffer.x >= this._bufferService.cols) return true;
          const e3 = this._activeBuffer.x;
          return this._activeBuffer.x = this._activeBuffer.nextStop(), this._optionsService.rawOptions.screenReaderMode && this._onA11yTab.fire(this._activeBuffer.x - e3), true;
        }
        shiftOut() {
          return this._charsetService.setgLevel(1), true;
        }
        shiftIn() {
          return this._charsetService.setgLevel(0), true;
        }
        _restrictCursor(e3 = this._bufferService.cols - 1) {
          this._activeBuffer.x = Math.min(e3, Math.max(0, this._activeBuffer.x)), this._activeBuffer.y = this._coreService.decPrivateModes.origin ? Math.min(this._activeBuffer.scrollBottom, Math.max(this._activeBuffer.scrollTop, this._activeBuffer.y)) : Math.min(this._bufferService.rows - 1, Math.max(0, this._activeBuffer.y)), this._dirtyRowTracker.markDirty(this._activeBuffer.y);
        }
        _setCursor(e3, t4) {
          this._dirtyRowTracker.markDirty(this._activeBuffer.y), this._coreService.decPrivateModes.origin ? (this._activeBuffer.x = e3, this._activeBuffer.y = this._activeBuffer.scrollTop + t4) : (this._activeBuffer.x = e3, this._activeBuffer.y = t4), this._restrictCursor(), this._dirtyRowTracker.markDirty(this._activeBuffer.y);
        }
        _moveCursor(e3, t4) {
          this._restrictCursor(), this._setCursor(this._activeBuffer.x + e3, this._activeBuffer.y + t4);
        }
        cursorUp(e3) {
          const t4 = this._activeBuffer.y - this._activeBuffer.scrollTop;
          return t4 >= 0 ? this._moveCursor(0, -Math.min(t4, e3.params[0] || 1)) : this._moveCursor(0, -(e3.params[0] || 1)), true;
        }
        cursorDown(e3) {
          const t4 = this._activeBuffer.scrollBottom - this._activeBuffer.y;
          return t4 >= 0 ? this._moveCursor(0, Math.min(t4, e3.params[0] || 1)) : this._moveCursor(0, e3.params[0] || 1), true;
        }
        cursorForward(e3) {
          return this._moveCursor(e3.params[0] || 1, 0), true;
        }
        cursorBackward(e3) {
          return this._moveCursor(-(e3.params[0] || 1), 0), true;
        }
        cursorNextLine(e3) {
          return this.cursorDown(e3), this._activeBuffer.x = 0, true;
        }
        cursorPrecedingLine(e3) {
          return this.cursorUp(e3), this._activeBuffer.x = 0, true;
        }
        cursorCharAbsolute(e3) {
          return this._setCursor((e3.params[0] || 1) - 1, this._activeBuffer.y), true;
        }
        cursorPosition(e3) {
          return this._setCursor(e3.length >= 2 ? (e3.params[1] || 1) - 1 : 0, (e3.params[0] || 1) - 1), true;
        }
        charPosAbsolute(e3) {
          return this._setCursor((e3.params[0] || 1) - 1, this._activeBuffer.y), true;
        }
        hPositionRelative(e3) {
          return this._moveCursor(e3.params[0] || 1, 0), true;
        }
        linePosAbsolute(e3) {
          return this._setCursor(this._activeBuffer.x, (e3.params[0] || 1) - 1), true;
        }
        vPositionRelative(e3) {
          return this._moveCursor(0, e3.params[0] || 1), true;
        }
        hVPosition(e3) {
          return this.cursorPosition(e3), true;
        }
        tabClear(e3) {
          const t4 = e3.params[0];
          return 0 === t4 ? delete this._activeBuffer.tabs[this._activeBuffer.x] : 3 === t4 && (this._activeBuffer.tabs = {}), true;
        }
        cursorForwardTab(e3) {
          if (this._activeBuffer.x >= this._bufferService.cols) return true;
          let t4 = e3.params[0] || 1;
          for (; t4--; ) this._activeBuffer.x = this._activeBuffer.nextStop();
          return true;
        }
        cursorBackwardTab(e3) {
          if (this._activeBuffer.x >= this._bufferService.cols) return true;
          let t4 = e3.params[0] || 1;
          for (; t4--; ) this._activeBuffer.x = this._activeBuffer.prevStop();
          return true;
        }
        selectProtected(e3) {
          const t4 = e3.params[0];
          return 1 === t4 && (this._curAttrData.bg |= 536870912), 2 !== t4 && 0 !== t4 || (this._curAttrData.bg &= -536870913), true;
        }
        _eraseInBufferLine(e3, t4, i3, s3 = false, r3 = false) {
          const n3 = this._activeBuffer.lines.get(this._activeBuffer.ybase + e3);
          n3.replaceCells(t4, i3, this._activeBuffer.getNullCell(this._eraseAttrData()), r3), s3 && (n3.isWrapped = false);
        }
        _resetBufferLine(e3, t4 = false) {
          const i3 = this._activeBuffer.lines.get(this._activeBuffer.ybase + e3);
          i3 && (i3.fill(this._activeBuffer.getNullCell(this._eraseAttrData()), t4), this._bufferService.buffer.clearMarkers(this._activeBuffer.ybase + e3), i3.isWrapped = false);
        }
        eraseInDisplay(e3, t4 = false) {
          let i3;
          switch (this._restrictCursor(this._bufferService.cols), e3.params[0]) {
            case 0:
              for (i3 = this._activeBuffer.y, this._dirtyRowTracker.markDirty(i3), this._eraseInBufferLine(i3++, this._activeBuffer.x, this._bufferService.cols, 0 === this._activeBuffer.x, t4); i3 < this._bufferService.rows; i3++) this._resetBufferLine(i3, t4);
              this._dirtyRowTracker.markDirty(i3);
              break;
            case 1:
              for (i3 = this._activeBuffer.y, this._dirtyRowTracker.markDirty(i3), this._eraseInBufferLine(i3, 0, this._activeBuffer.x + 1, true, t4), this._activeBuffer.x + 1 >= this._bufferService.cols && (this._activeBuffer.lines.get(i3 + 1).isWrapped = false); i3--; ) this._resetBufferLine(i3, t4);
              this._dirtyRowTracker.markDirty(0);
              break;
            case 2:
              for (i3 = this._bufferService.rows, this._dirtyRowTracker.markDirty(i3 - 1); i3--; ) this._resetBufferLine(i3, t4);
              this._dirtyRowTracker.markDirty(0);
              break;
            case 3:
              const e4 = this._activeBuffer.lines.length - this._bufferService.rows;
              e4 > 0 && (this._activeBuffer.lines.trimStart(e4), this._activeBuffer.ybase = Math.max(this._activeBuffer.ybase - e4, 0), this._activeBuffer.ydisp = Math.max(this._activeBuffer.ydisp - e4, 0), this._onScroll.fire(0));
          }
          return true;
        }
        eraseInLine(e3, t4 = false) {
          switch (this._restrictCursor(this._bufferService.cols), e3.params[0]) {
            case 0:
              this._eraseInBufferLine(this._activeBuffer.y, this._activeBuffer.x, this._bufferService.cols, 0 === this._activeBuffer.x, t4);
              break;
            case 1:
              this._eraseInBufferLine(this._activeBuffer.y, 0, this._activeBuffer.x + 1, false, t4);
              break;
            case 2:
              this._eraseInBufferLine(this._activeBuffer.y, 0, this._bufferService.cols, true, t4);
          }
          return this._dirtyRowTracker.markDirty(this._activeBuffer.y), true;
        }
        insertLines(e3) {
          this._restrictCursor();
          let t4 = e3.params[0] || 1;
          if (this._activeBuffer.y > this._activeBuffer.scrollBottom || this._activeBuffer.y < this._activeBuffer.scrollTop) return true;
          const i3 = this._activeBuffer.ybase + this._activeBuffer.y, s3 = this._bufferService.rows - 1 - this._activeBuffer.scrollBottom, r3 = this._bufferService.rows - 1 + this._activeBuffer.ybase - s3 + 1;
          for (; t4--; ) this._activeBuffer.lines.splice(r3 - 1, 1), this._activeBuffer.lines.splice(i3, 0, this._activeBuffer.getBlankLine(this._eraseAttrData()));
          return this._dirtyRowTracker.markRangeDirty(this._activeBuffer.y, this._activeBuffer.scrollBottom), this._activeBuffer.x = 0, true;
        }
        deleteLines(e3) {
          this._restrictCursor();
          let t4 = e3.params[0] || 1;
          if (this._activeBuffer.y > this._activeBuffer.scrollBottom || this._activeBuffer.y < this._activeBuffer.scrollTop) return true;
          const i3 = this._activeBuffer.ybase + this._activeBuffer.y;
          let s3;
          for (s3 = this._bufferService.rows - 1 - this._activeBuffer.scrollBottom, s3 = this._bufferService.rows - 1 + this._activeBuffer.ybase - s3; t4--; ) this._activeBuffer.lines.splice(i3, 1), this._activeBuffer.lines.splice(s3, 0, this._activeBuffer.getBlankLine(this._eraseAttrData()));
          return this._dirtyRowTracker.markRangeDirty(this._activeBuffer.y, this._activeBuffer.scrollBottom), this._activeBuffer.x = 0, true;
        }
        insertChars(e3) {
          this._restrictCursor();
          const t4 = this._activeBuffer.lines.get(this._activeBuffer.ybase + this._activeBuffer.y);
          return t4 && (t4.insertCells(this._activeBuffer.x, e3.params[0] || 1, this._activeBuffer.getNullCell(this._eraseAttrData())), this._dirtyRowTracker.markDirty(this._activeBuffer.y)), true;
        }
        deleteChars(e3) {
          this._restrictCursor();
          const t4 = this._activeBuffer.lines.get(this._activeBuffer.ybase + this._activeBuffer.y);
          return t4 && (t4.deleteCells(this._activeBuffer.x, e3.params[0] || 1, this._activeBuffer.getNullCell(this._eraseAttrData())), this._dirtyRowTracker.markDirty(this._activeBuffer.y)), true;
        }
        scrollUp(e3) {
          let t4 = e3.params[0] || 1;
          for (; t4--; ) this._activeBuffer.lines.splice(this._activeBuffer.ybase + this._activeBuffer.scrollTop, 1), this._activeBuffer.lines.splice(this._activeBuffer.ybase + this._activeBuffer.scrollBottom, 0, this._activeBuffer.getBlankLine(this._eraseAttrData()));
          return this._dirtyRowTracker.markRangeDirty(this._activeBuffer.scrollTop, this._activeBuffer.scrollBottom), true;
        }
        scrollDown(e3) {
          let t4 = e3.params[0] || 1;
          for (; t4--; ) this._activeBuffer.lines.splice(this._activeBuffer.ybase + this._activeBuffer.scrollBottom, 1), this._activeBuffer.lines.splice(this._activeBuffer.ybase + this._activeBuffer.scrollTop, 0, this._activeBuffer.getBlankLine(l2.DEFAULT_ATTR_DATA));
          return this._dirtyRowTracker.markRangeDirty(this._activeBuffer.scrollTop, this._activeBuffer.scrollBottom), true;
        }
        scrollLeft(e3) {
          if (this._activeBuffer.y > this._activeBuffer.scrollBottom || this._activeBuffer.y < this._activeBuffer.scrollTop) return true;
          const t4 = e3.params[0] || 1;
          for (let e4 = this._activeBuffer.scrollTop; e4 <= this._activeBuffer.scrollBottom; ++e4) {
            const i3 = this._activeBuffer.lines.get(this._activeBuffer.ybase + e4);
            i3.deleteCells(0, t4, this._activeBuffer.getNullCell(this._eraseAttrData())), i3.isWrapped = false;
          }
          return this._dirtyRowTracker.markRangeDirty(this._activeBuffer.scrollTop, this._activeBuffer.scrollBottom), true;
        }
        scrollRight(e3) {
          if (this._activeBuffer.y > this._activeBuffer.scrollBottom || this._activeBuffer.y < this._activeBuffer.scrollTop) return true;
          const t4 = e3.params[0] || 1;
          for (let e4 = this._activeBuffer.scrollTop; e4 <= this._activeBuffer.scrollBottom; ++e4) {
            const i3 = this._activeBuffer.lines.get(this._activeBuffer.ybase + e4);
            i3.insertCells(0, t4, this._activeBuffer.getNullCell(this._eraseAttrData())), i3.isWrapped = false;
          }
          return this._dirtyRowTracker.markRangeDirty(this._activeBuffer.scrollTop, this._activeBuffer.scrollBottom), true;
        }
        insertColumns(e3) {
          if (this._activeBuffer.y > this._activeBuffer.scrollBottom || this._activeBuffer.y < this._activeBuffer.scrollTop) return true;
          const t4 = e3.params[0] || 1;
          for (let e4 = this._activeBuffer.scrollTop; e4 <= this._activeBuffer.scrollBottom; ++e4) {
            const i3 = this._activeBuffer.lines.get(this._activeBuffer.ybase + e4);
            i3.insertCells(this._activeBuffer.x, t4, this._activeBuffer.getNullCell(this._eraseAttrData())), i3.isWrapped = false;
          }
          return this._dirtyRowTracker.markRangeDirty(this._activeBuffer.scrollTop, this._activeBuffer.scrollBottom), true;
        }
        deleteColumns(e3) {
          if (this._activeBuffer.y > this._activeBuffer.scrollBottom || this._activeBuffer.y < this._activeBuffer.scrollTop) return true;
          const t4 = e3.params[0] || 1;
          for (let e4 = this._activeBuffer.scrollTop; e4 <= this._activeBuffer.scrollBottom; ++e4) {
            const i3 = this._activeBuffer.lines.get(this._activeBuffer.ybase + e4);
            i3.deleteCells(this._activeBuffer.x, t4, this._activeBuffer.getNullCell(this._eraseAttrData())), i3.isWrapped = false;
          }
          return this._dirtyRowTracker.markRangeDirty(this._activeBuffer.scrollTop, this._activeBuffer.scrollBottom), true;
        }
        eraseChars(e3) {
          this._restrictCursor();
          const t4 = this._activeBuffer.lines.get(this._activeBuffer.ybase + this._activeBuffer.y);
          return t4 && (t4.replaceCells(this._activeBuffer.x, this._activeBuffer.x + (e3.params[0] || 1), this._activeBuffer.getNullCell(this._eraseAttrData())), this._dirtyRowTracker.markDirty(this._activeBuffer.y)), true;
        }
        repeatPrecedingCharacter(e3) {
          const t4 = this._parser.precedingJoinState;
          if (!t4) return true;
          const i3 = e3.params[0] || 1, s3 = p2.UnicodeService.extractWidth(t4), r3 = this._activeBuffer.x - s3, n3 = this._activeBuffer.lines.get(this._activeBuffer.ybase + this._activeBuffer.y).getString(r3), o2 = new Uint32Array(n3.length * i3);
          let a2 = 0;
          for (let e4 = 0; e4 < n3.length; ) {
            const t5 = n3.codePointAt(e4) || 0;
            o2[a2++] = t5, e4 += t5 > 65535 ? 2 : 1;
          }
          let h2 = a2;
          for (let e4 = 1; e4 < i3; ++e4) o2.copyWithin(h2, 0, a2), h2 += a2;
          return this.print(o2, 0, h2), true;
        }
        sendDeviceAttributesPrimary(e3) {
          return e3.params[0] > 0 || (this._is("xterm") || this._is("rxvt-unicode") || this._is("screen") ? this._coreService.triggerDataEvent(n2.C0.ESC + "[?1;2c") : this._is("linux") && this._coreService.triggerDataEvent(n2.C0.ESC + "[?6c")), true;
        }
        sendDeviceAttributesSecondary(e3) {
          return e3.params[0] > 0 || (this._is("xterm") ? this._coreService.triggerDataEvent(n2.C0.ESC + "[>0;276;0c") : this._is("rxvt-unicode") ? this._coreService.triggerDataEvent(n2.C0.ESC + "[>85;95;0c") : this._is("linux") ? this._coreService.triggerDataEvent(e3.params[0] + "c") : this._is("screen") && this._coreService.triggerDataEvent(n2.C0.ESC + "[>83;40003;0c")), true;
        }
        _is(e3) {
          return 0 === (this._optionsService.rawOptions.termName + "").indexOf(e3);
        }
        setMode(e3) {
          for (let t4 = 0; t4 < e3.length; t4++) switch (e3.params[t4]) {
            case 4:
              this._coreService.modes.insertMode = true;
              break;
            case 20:
              this._optionsService.options.convertEol = true;
          }
          return true;
        }
        setModePrivate(e3) {
          for (let t4 = 0; t4 < e3.length; t4++) switch (e3.params[t4]) {
            case 1:
              this._coreService.decPrivateModes.applicationCursorKeys = true;
              break;
            case 2:
              this._charsetService.setgCharset(0, o.DEFAULT_CHARSET), this._charsetService.setgCharset(1, o.DEFAULT_CHARSET), this._charsetService.setgCharset(2, o.DEFAULT_CHARSET), this._charsetService.setgCharset(3, o.DEFAULT_CHARSET);
              break;
            case 3:
              this._optionsService.rawOptions.windowOptions.setWinLines && (this._bufferService.resize(132, this._bufferService.rows), this._onRequestReset.fire());
              break;
            case 6:
              this._coreService.decPrivateModes.origin = true, this._setCursor(0, 0);
              break;
            case 7:
              this._coreService.decPrivateModes.wraparound = true;
              break;
            case 12:
              this._optionsService.options.cursorBlink = true;
              break;
            case 45:
              this._coreService.decPrivateModes.reverseWraparound = true;
              break;
            case 66:
              this._logService.debug("Serial port requested application keypad."), this._coreService.decPrivateModes.applicationKeypad = true, this._onRequestSyncScrollBar.fire();
              break;
            case 9:
              this._coreMouseService.activeProtocol = "X10";
              break;
            case 1e3:
              this._coreMouseService.activeProtocol = "VT200";
              break;
            case 1002:
              this._coreMouseService.activeProtocol = "DRAG";
              break;
            case 1003:
              this._coreMouseService.activeProtocol = "ANY";
              break;
            case 1004:
              this._coreService.decPrivateModes.sendFocus = true, this._onRequestSendFocus.fire();
              break;
            case 1005:
              this._logService.debug("DECSET 1005 not supported (see #2507)");
              break;
            case 1006:
              this._coreMouseService.activeEncoding = "SGR";
              break;
            case 1015:
              this._logService.debug("DECSET 1015 not supported (see #2507)");
              break;
            case 1016:
              this._coreMouseService.activeEncoding = "SGR_PIXELS";
              break;
            case 25:
              this._coreService.isCursorHidden = false;
              break;
            case 1048:
              this.saveCursor();
              break;
            case 1049:
              this.saveCursor();
            case 47:
            case 1047:
              this._bufferService.buffers.activateAltBuffer(this._eraseAttrData()), this._coreService.isCursorInitialized = true, this._onRequestRefreshRows.fire(0, this._bufferService.rows - 1), this._onRequestSyncScrollBar.fire();
              break;
            case 2004:
              this._coreService.decPrivateModes.bracketedPasteMode = true;
          }
          return true;
        }
        resetMode(e3) {
          for (let t4 = 0; t4 < e3.length; t4++) switch (e3.params[t4]) {
            case 4:
              this._coreService.modes.insertMode = false;
              break;
            case 20:
              this._optionsService.options.convertEol = false;
          }
          return true;
        }
        resetModePrivate(e3) {
          for (let t4 = 0; t4 < e3.length; t4++) switch (e3.params[t4]) {
            case 1:
              this._coreService.decPrivateModes.applicationCursorKeys = false;
              break;
            case 3:
              this._optionsService.rawOptions.windowOptions.setWinLines && (this._bufferService.resize(80, this._bufferService.rows), this._onRequestReset.fire());
              break;
            case 6:
              this._coreService.decPrivateModes.origin = false, this._setCursor(0, 0);
              break;
            case 7:
              this._coreService.decPrivateModes.wraparound = false;
              break;
            case 12:
              this._optionsService.options.cursorBlink = false;
              break;
            case 45:
              this._coreService.decPrivateModes.reverseWraparound = false;
              break;
            case 66:
              this._logService.debug("Switching back to normal keypad."), this._coreService.decPrivateModes.applicationKeypad = false, this._onRequestSyncScrollBar.fire();
              break;
            case 9:
            case 1e3:
            case 1002:
            case 1003:
              this._coreMouseService.activeProtocol = "NONE";
              break;
            case 1004:
              this._coreService.decPrivateModes.sendFocus = false;
              break;
            case 1005:
              this._logService.debug("DECRST 1005 not supported (see #2507)");
              break;
            case 1006:
            case 1016:
              this._coreMouseService.activeEncoding = "DEFAULT";
              break;
            case 1015:
              this._logService.debug("DECRST 1015 not supported (see #2507)");
              break;
            case 25:
              this._coreService.isCursorHidden = true;
              break;
            case 1048:
              this.restoreCursor();
              break;
            case 1049:
            case 47:
            case 1047:
              this._bufferService.buffers.activateNormalBuffer(), 1049 === e3.params[t4] && this.restoreCursor(), this._coreService.isCursorInitialized = true, this._onRequestRefreshRows.fire(0, this._bufferService.rows - 1), this._onRequestSyncScrollBar.fire();
              break;
            case 2004:
              this._coreService.decPrivateModes.bracketedPasteMode = false;
          }
          return true;
        }
        requestMode(e3, t4) {
          const i3 = this._coreService.decPrivateModes, { activeProtocol: s3, activeEncoding: r3 } = this._coreMouseService, o2 = this._coreService, { buffers: a2, cols: h2 } = this._bufferService, { active: c2, alt: l3 } = a2, d2 = this._optionsService.rawOptions, _2 = (e4) => e4 ? 1 : 2, u3 = e3.params[0];
          return f3 = u3, v3 = t4 ? 2 === u3 ? 4 : 4 === u3 ? _2(o2.modes.insertMode) : 12 === u3 ? 3 : 20 === u3 ? _2(d2.convertEol) : 0 : 1 === u3 ? _2(i3.applicationCursorKeys) : 3 === u3 ? d2.windowOptions.setWinLines ? 80 === h2 ? 2 : 132 === h2 ? 1 : 0 : 0 : 6 === u3 ? _2(i3.origin) : 7 === u3 ? _2(i3.wraparound) : 8 === u3 ? 3 : 9 === u3 ? _2("X10" === s3) : 12 === u3 ? _2(d2.cursorBlink) : 25 === u3 ? _2(!o2.isCursorHidden) : 45 === u3 ? _2(i3.reverseWraparound) : 66 === u3 ? _2(i3.applicationKeypad) : 67 === u3 ? 4 : 1e3 === u3 ? _2("VT200" === s3) : 1002 === u3 ? _2("DRAG" === s3) : 1003 === u3 ? _2("ANY" === s3) : 1004 === u3 ? _2(i3.sendFocus) : 1005 === u3 ? 4 : 1006 === u3 ? _2("SGR" === r3) : 1015 === u3 ? 4 : 1016 === u3 ? _2("SGR_PIXELS" === r3) : 1048 === u3 ? 1 : 47 === u3 || 1047 === u3 || 1049 === u3 ? _2(c2 === l3) : 2004 === u3 ? _2(i3.bracketedPasteMode) : 0, o2.triggerDataEvent(`${n2.C0.ESC}[${t4 ? "" : "?"}${f3};${v3}$y`), true;
          var f3, v3;
        }
        _updateAttrColor(e3, t4, i3, s3, r3) {
          return 2 === t4 ? (e3 |= 50331648, e3 &= -16777216, e3 |= f2.AttributeData.fromColorRGB([i3, s3, r3])) : 5 === t4 && (e3 &= -50331904, e3 |= 33554432 | 255 & i3), e3;
        }
        _extractColor(e3, t4, i3) {
          const s3 = [0, 0, -1, 0, 0, 0];
          let r3 = 0, n3 = 0;
          do {
            if (s3[n3 + r3] = e3.params[t4 + n3], e3.hasSubParams(t4 + n3)) {
              const i4 = e3.getSubParams(t4 + n3);
              let o2 = 0;
              do {
                5 === s3[1] && (r3 = 1), s3[n3 + o2 + 1 + r3] = i4[o2];
              } while (++o2 < i4.length && o2 + n3 + 1 + r3 < s3.length);
              break;
            }
            if (5 === s3[1] && n3 + r3 >= 2 || 2 === s3[1] && n3 + r3 >= 5) break;
            s3[1] && (r3 = 1);
          } while (++n3 + t4 < e3.length && n3 + r3 < s3.length);
          for (let e4 = 2; e4 < s3.length; ++e4) -1 === s3[e4] && (s3[e4] = 0);
          switch (s3[0]) {
            case 38:
              i3.fg = this._updateAttrColor(i3.fg, s3[1], s3[3], s3[4], s3[5]);
              break;
            case 48:
              i3.bg = this._updateAttrColor(i3.bg, s3[1], s3[3], s3[4], s3[5]);
              break;
            case 58:
              i3.extended = i3.extended.clone(), i3.extended.underlineColor = this._updateAttrColor(i3.extended.underlineColor, s3[1], s3[3], s3[4], s3[5]);
          }
          return n3;
        }
        _processUnderline(e3, t4) {
          t4.extended = t4.extended.clone(), (!~e3 || e3 > 5) && (e3 = 1), t4.extended.underlineStyle = e3, t4.fg |= 268435456, 0 === e3 && (t4.fg &= -268435457), t4.updateExtended();
        }
        _processSGR0(e3) {
          e3.fg = l2.DEFAULT_ATTR_DATA.fg, e3.bg = l2.DEFAULT_ATTR_DATA.bg, e3.extended = e3.extended.clone(), e3.extended.underlineStyle = 0, e3.extended.underlineColor &= -67108864, e3.updateExtended();
        }
        charAttributes(e3) {
          if (1 === e3.length && 0 === e3.params[0]) return this._processSGR0(this._curAttrData), true;
          const t4 = e3.length;
          let i3;
          const s3 = this._curAttrData;
          for (let r3 = 0; r3 < t4; r3++) i3 = e3.params[r3], i3 >= 30 && i3 <= 37 ? (s3.fg &= -50331904, s3.fg |= 16777216 | i3 - 30) : i3 >= 40 && i3 <= 47 ? (s3.bg &= -50331904, s3.bg |= 16777216 | i3 - 40) : i3 >= 90 && i3 <= 97 ? (s3.fg &= -50331904, s3.fg |= 16777224 | i3 - 90) : i3 >= 100 && i3 <= 107 ? (s3.bg &= -50331904, s3.bg |= 16777224 | i3 - 100) : 0 === i3 ? this._processSGR0(s3) : 1 === i3 ? s3.fg |= 134217728 : 3 === i3 ? s3.bg |= 67108864 : 4 === i3 ? (s3.fg |= 268435456, this._processUnderline(e3.hasSubParams(r3) ? e3.getSubParams(r3)[0] : 1, s3)) : 5 === i3 ? s3.fg |= 536870912 : 7 === i3 ? s3.fg |= 67108864 : 8 === i3 ? s3.fg |= 1073741824 : 9 === i3 ? s3.fg |= 2147483648 : 2 === i3 ? s3.bg |= 134217728 : 21 === i3 ? this._processUnderline(2, s3) : 22 === i3 ? (s3.fg &= -134217729, s3.bg &= -134217729) : 23 === i3 ? s3.bg &= -67108865 : 24 === i3 ? (s3.fg &= -268435457, this._processUnderline(0, s3)) : 25 === i3 ? s3.fg &= -536870913 : 27 === i3 ? s3.fg &= -67108865 : 28 === i3 ? s3.fg &= -1073741825 : 29 === i3 ? s3.fg &= 2147483647 : 39 === i3 ? (s3.fg &= -67108864, s3.fg |= 16777215 & l2.DEFAULT_ATTR_DATA.fg) : 49 === i3 ? (s3.bg &= -67108864, s3.bg |= 16777215 & l2.DEFAULT_ATTR_DATA.bg) : 38 === i3 || 48 === i3 || 58 === i3 ? r3 += this._extractColor(e3, r3, s3) : 53 === i3 ? s3.bg |= 1073741824 : 55 === i3 ? s3.bg &= -1073741825 : 59 === i3 ? (s3.extended = s3.extended.clone(), s3.extended.underlineColor = -1, s3.updateExtended()) : 100 === i3 ? (s3.fg &= -67108864, s3.fg |= 16777215 & l2.DEFAULT_ATTR_DATA.fg, s3.bg &= -67108864, s3.bg |= 16777215 & l2.DEFAULT_ATTR_DATA.bg) : this._logService.debug("Unknown SGR attribute: %d.", i3);
          return true;
        }
        deviceStatus(e3) {
          switch (e3.params[0]) {
            case 5:
              this._coreService.triggerDataEvent(`${n2.C0.ESC}[0n`);
              break;
            case 6:
              const e4 = this._activeBuffer.y + 1, t4 = this._activeBuffer.x + 1;
              this._coreService.triggerDataEvent(`${n2.C0.ESC}[${e4};${t4}R`);
          }
          return true;
        }
        deviceStatusPrivate(e3) {
          if (6 === e3.params[0]) {
            const e4 = this._activeBuffer.y + 1, t4 = this._activeBuffer.x + 1;
            this._coreService.triggerDataEvent(`${n2.C0.ESC}[?${e4};${t4}R`);
          }
          return true;
        }
        softReset(e3) {
          return this._coreService.isCursorHidden = false, this._onRequestSyncScrollBar.fire(), this._activeBuffer.scrollTop = 0, this._activeBuffer.scrollBottom = this._bufferService.rows - 1, this._curAttrData = l2.DEFAULT_ATTR_DATA.clone(), this._coreService.reset(), this._charsetService.reset(), this._activeBuffer.savedX = 0, this._activeBuffer.savedY = this._activeBuffer.ybase, this._activeBuffer.savedCurAttrData.fg = this._curAttrData.fg, this._activeBuffer.savedCurAttrData.bg = this._curAttrData.bg, this._activeBuffer.savedCharset = this._charsetService.charset, this._coreService.decPrivateModes.origin = false, true;
        }
        setCursorStyle(e3) {
          const t4 = e3.params[0] || 1;
          switch (t4) {
            case 1:
            case 2:
              this._optionsService.options.cursorStyle = "block";
              break;
            case 3:
            case 4:
              this._optionsService.options.cursorStyle = "underline";
              break;
            case 5:
            case 6:
              this._optionsService.options.cursorStyle = "bar";
          }
          const i3 = t4 % 2 == 1;
          return this._optionsService.options.cursorBlink = i3, true;
        }
        setScrollRegion(e3) {
          const t4 = e3.params[0] || 1;
          let i3;
          return (e3.length < 2 || (i3 = e3.params[1]) > this._bufferService.rows || 0 === i3) && (i3 = this._bufferService.rows), i3 > t4 && (this._activeBuffer.scrollTop = t4 - 1, this._activeBuffer.scrollBottom = i3 - 1, this._setCursor(0, 0)), true;
        }
        windowOptions(e3) {
          if (!w2(e3.params[0], this._optionsService.rawOptions.windowOptions)) return true;
          const t4 = e3.length > 1 ? e3.params[1] : 0;
          switch (e3.params[0]) {
            case 14:
              2 !== t4 && this._onRequestWindowsOptionsReport.fire(y2.GET_WIN_SIZE_PIXELS);
              break;
            case 16:
              this._onRequestWindowsOptionsReport.fire(y2.GET_CELL_SIZE_PIXELS);
              break;
            case 18:
              this._bufferService && this._coreService.triggerDataEvent(`${n2.C0.ESC}[8;${this._bufferService.rows};${this._bufferService.cols}t`);
              break;
            case 22:
              0 !== t4 && 2 !== t4 || (this._windowTitleStack.push(this._windowTitle), this._windowTitleStack.length > 10 && this._windowTitleStack.shift()), 0 !== t4 && 1 !== t4 || (this._iconNameStack.push(this._iconName), this._iconNameStack.length > 10 && this._iconNameStack.shift());
              break;
            case 23:
              0 !== t4 && 2 !== t4 || this._windowTitleStack.length && this.setTitle(this._windowTitleStack.pop()), 0 !== t4 && 1 !== t4 || this._iconNameStack.length && this.setIconName(this._iconNameStack.pop());
          }
          return true;
        }
        saveCursor(e3) {
          return this._activeBuffer.savedX = this._activeBuffer.x, this._activeBuffer.savedY = this._activeBuffer.ybase + this._activeBuffer.y, this._activeBuffer.savedCurAttrData.fg = this._curAttrData.fg, this._activeBuffer.savedCurAttrData.bg = this._curAttrData.bg, this._activeBuffer.savedCharset = this._charsetService.charset, true;
        }
        restoreCursor(e3) {
          return this._activeBuffer.x = this._activeBuffer.savedX || 0, this._activeBuffer.y = Math.max(this._activeBuffer.savedY - this._activeBuffer.ybase, 0), this._curAttrData.fg = this._activeBuffer.savedCurAttrData.fg, this._curAttrData.bg = this._activeBuffer.savedCurAttrData.bg, this._charsetService.charset = this._savedCharset, this._activeBuffer.savedCharset && (this._charsetService.charset = this._activeBuffer.savedCharset), this._restrictCursor(), true;
        }
        setTitle(e3) {
          return this._windowTitle = e3, this._onTitleChange.fire(e3), true;
        }
        setIconName(e3) {
          return this._iconName = e3, true;
        }
        setOrReportIndexedColor(e3) {
          const t4 = [], i3 = e3.split(";");
          for (; i3.length > 1; ) {
            const e4 = i3.shift(), s3 = i3.shift();
            if (/^\d+$/.exec(e4)) {
              const i4 = parseInt(e4);
              if (D2(i4)) if ("?" === s3) t4.push({ type: 0, index: i4 });
              else {
                const e5 = (0, S2.parseColor)(s3);
                e5 && t4.push({ type: 1, index: i4, color: e5 });
              }
            }
          }
          return t4.length && this._onColor.fire(t4), true;
        }
        setHyperlink(e3) {
          const t4 = e3.split(";");
          return !(t4.length < 2) && (t4[1] ? this._createHyperlink(t4[0], t4[1]) : !t4[0] && this._finishHyperlink());
        }
        _createHyperlink(e3, t4) {
          this._getCurrentLinkId() && this._finishHyperlink();
          const i3 = e3.split(":");
          let s3;
          const r3 = i3.findIndex((e4) => e4.startsWith("id="));
          return -1 !== r3 && (s3 = i3[r3].slice(3) || void 0), this._curAttrData.extended = this._curAttrData.extended.clone(), this._curAttrData.extended.urlId = this._oscLinkService.registerLink({ id: s3, uri: t4 }), this._curAttrData.updateExtended(), true;
        }
        _finishHyperlink() {
          return this._curAttrData.extended = this._curAttrData.extended.clone(), this._curAttrData.extended.urlId = 0, this._curAttrData.updateExtended(), true;
        }
        _setOrReportSpecialColor(e3, t4) {
          const i3 = e3.split(";");
          for (let e4 = 0; e4 < i3.length && !(t4 >= this._specialColors.length); ++e4, ++t4) if ("?" === i3[e4]) this._onColor.fire([{ type: 0, index: this._specialColors[t4] }]);
          else {
            const s3 = (0, S2.parseColor)(i3[e4]);
            s3 && this._onColor.fire([{ type: 1, index: this._specialColors[t4], color: s3 }]);
          }
          return true;
        }
        setOrReportFgColor(e3) {
          return this._setOrReportSpecialColor(e3, 0);
        }
        setOrReportBgColor(e3) {
          return this._setOrReportSpecialColor(e3, 1);
        }
        setOrReportCursorColor(e3) {
          return this._setOrReportSpecialColor(e3, 2);
        }
        restoreIndexedColor(e3) {
          if (!e3) return this._onColor.fire([{ type: 2 }]), true;
          const t4 = [], i3 = e3.split(";");
          for (let e4 = 0; e4 < i3.length; ++e4) if (/^\d+$/.exec(i3[e4])) {
            const s3 = parseInt(i3[e4]);
            D2(s3) && t4.push({ type: 2, index: s3 });
          }
          return t4.length && this._onColor.fire(t4), true;
        }
        restoreFgColor(e3) {
          return this._onColor.fire([{ type: 2, index: 256 }]), true;
        }
        restoreBgColor(e3) {
          return this._onColor.fire([{ type: 2, index: 257 }]), true;
        }
        restoreCursorColor(e3) {
          return this._onColor.fire([{ type: 2, index: 258 }]), true;
        }
        nextLine() {
          return this._activeBuffer.x = 0, this.index(), true;
        }
        keypadApplicationMode() {
          return this._logService.debug("Serial port requested application keypad."), this._coreService.decPrivateModes.applicationKeypad = true, this._onRequestSyncScrollBar.fire(), true;
        }
        keypadNumericMode() {
          return this._logService.debug("Switching back to normal keypad."), this._coreService.decPrivateModes.applicationKeypad = false, this._onRequestSyncScrollBar.fire(), true;
        }
        selectDefaultCharset() {
          return this._charsetService.setgLevel(0), this._charsetService.setgCharset(0, o.DEFAULT_CHARSET), true;
        }
        selectCharset(e3) {
          return 2 !== e3.length ? (this.selectDefaultCharset(), true) : ("/" === e3[0] || this._charsetService.setgCharset(C2[e3[0]], o.CHARSETS[e3[1]] || o.DEFAULT_CHARSET), true);
        }
        index() {
          return this._restrictCursor(), this._activeBuffer.y++, this._activeBuffer.y === this._activeBuffer.scrollBottom + 1 ? (this._activeBuffer.y--, this._bufferService.scroll(this._eraseAttrData())) : this._activeBuffer.y >= this._bufferService.rows && (this._activeBuffer.y = this._bufferService.rows - 1), this._restrictCursor(), true;
        }
        tabSet() {
          return this._activeBuffer.tabs[this._activeBuffer.x] = true, true;
        }
        reverseIndex() {
          if (this._restrictCursor(), this._activeBuffer.y === this._activeBuffer.scrollTop) {
            const e3 = this._activeBuffer.scrollBottom - this._activeBuffer.scrollTop;
            this._activeBuffer.lines.shiftElements(this._activeBuffer.ybase + this._activeBuffer.y, e3, 1), this._activeBuffer.lines.set(this._activeBuffer.ybase + this._activeBuffer.y, this._activeBuffer.getBlankLine(this._eraseAttrData())), this._dirtyRowTracker.markRangeDirty(this._activeBuffer.scrollTop, this._activeBuffer.scrollBottom);
          } else this._activeBuffer.y--, this._restrictCursor();
          return true;
        }
        fullReset() {
          return this._parser.reset(), this._onRequestReset.fire(), true;
        }
        reset() {
          this._curAttrData = l2.DEFAULT_ATTR_DATA.clone(), this._eraseAttrDataInternal = l2.DEFAULT_ATTR_DATA.clone();
        }
        _eraseAttrData() {
          return this._eraseAttrDataInternal.bg &= -67108864, this._eraseAttrDataInternal.bg |= 67108863 & this._curAttrData.bg, this._eraseAttrDataInternal;
        }
        setgLevel(e3) {
          return this._charsetService.setgLevel(e3), true;
        }
        screenAlignmentPattern() {
          const e3 = new u2.CellData();
          e3.content = 1 << 22 | "E".charCodeAt(0), e3.fg = this._curAttrData.fg, e3.bg = this._curAttrData.bg, this._setCursor(0, 0);
          for (let t4 = 0; t4 < this._bufferService.rows; ++t4) {
            const i3 = this._activeBuffer.ybase + this._activeBuffer.y + t4, s3 = this._activeBuffer.lines.get(i3);
            s3 && (s3.fill(e3), s3.isWrapped = false);
          }
          return this._dirtyRowTracker.markAllDirty(), this._setCursor(0, 0), true;
        }
        requestStatusString(e3, t4) {
          const i3 = this._bufferService.buffer, s3 = this._optionsService.rawOptions;
          return ((e4) => (this._coreService.triggerDataEvent(`${n2.C0.ESC}${e4}${n2.C0.ESC}\\`), true))('"q' === e3 ? `P1$r${this._curAttrData.isProtected() ? 1 : 0}"q` : '"p' === e3 ? 'P1$r61;1"p' : "r" === e3 ? `P1$r${i3.scrollTop + 1};${i3.scrollBottom + 1}r` : "m" === e3 ? "P1$r0m" : " q" === e3 ? `P1$r${{ block: 2, underline: 4, bar: 6 }[s3.cursorStyle] - (s3.cursorBlink ? 1 : 0)} q` : "P0$r");
        }
        markRangeDirty(e3, t4) {
          this._dirtyRowTracker.markRangeDirty(e3, t4);
        }
      }
      t3.InputHandler = k2;
      let L2 = class {
        constructor(e3) {
          this._bufferService = e3, this.clearRange();
        }
        clearRange() {
          this.start = this._bufferService.buffer.y, this.end = this._bufferService.buffer.y;
        }
        markDirty(e3) {
          e3 < this.start ? this.start = e3 : e3 > this.end && (this.end = e3);
        }
        markRangeDirty(e3, t4) {
          e3 > t4 && (E2 = e3, e3 = t4, t4 = E2), e3 < this.start && (this.start = e3), t4 > this.end && (this.end = t4);
        }
        markAllDirty() {
          this.markRangeDirty(0, this._bufferService.rows - 1);
        }
      };
      function D2(e3) {
        return 0 <= e3 && e3 < 256;
      }
      L2 = s2([r2(0, v2.IBufferService)], L2);
    }, 844: (e2, t3) => {
      function i2(e3) {
        for (const t4 of e3) t4.dispose();
        e3.length = 0;
      }
      Object.defineProperty(t3, "__esModule", { value: true }), t3.getDisposeArrayDisposable = t3.disposeArray = t3.toDisposable = t3.MutableDisposable = t3.Disposable = void 0, t3.Disposable = class {
        constructor() {
          this._disposables = [], this._isDisposed = false;
        }
        dispose() {
          this._isDisposed = true;
          for (const e3 of this._disposables) e3.dispose();
          this._disposables.length = 0;
        }
        register(e3) {
          return this._disposables.push(e3), e3;
        }
        unregister(e3) {
          const t4 = this._disposables.indexOf(e3);
          -1 !== t4 && this._disposables.splice(t4, 1);
        }
      }, t3.MutableDisposable = class {
        constructor() {
          this._isDisposed = false;
        }
        get value() {
          return this._isDisposed ? void 0 : this._value;
        }
        set value(e3) {
          this._isDisposed || e3 === this._value || (this._value?.dispose(), this._value = e3);
        }
        clear() {
          this.value = void 0;
        }
        dispose() {
          this._isDisposed = true, this._value?.dispose(), this._value = void 0;
        }
      }, t3.toDisposable = function(e3) {
        return { dispose: e3 };
      }, t3.disposeArray = i2, t3.getDisposeArrayDisposable = function(e3) {
        return { dispose: () => i2(e3) };
      };
    }, 1505: (e2, t3) => {
      Object.defineProperty(t3, "__esModule", { value: true }), t3.FourKeyMap = t3.TwoKeyMap = void 0;
      class i2 {
        constructor() {
          this._data = {};
        }
        set(e3, t4, i3) {
          this._data[e3] || (this._data[e3] = {}), this._data[e3][t4] = i3;
        }
        get(e3, t4) {
          return this._data[e3] ? this._data[e3][t4] : void 0;
        }
        clear() {
          this._data = {};
        }
      }
      t3.TwoKeyMap = i2, t3.FourKeyMap = class {
        constructor() {
          this._data = new i2();
        }
        set(e3, t4, s2, r2, n2) {
          this._data.get(e3, t4) || this._data.set(e3, t4, new i2()), this._data.get(e3, t4).set(s2, r2, n2);
        }
        get(e3, t4, i3, s2) {
          return this._data.get(e3, t4)?.get(i3, s2);
        }
        clear() {
          this._data.clear();
        }
      };
    }, 6114: (e2, t3) => {
      Object.defineProperty(t3, "__esModule", { value: true }), t3.isChromeOS = t3.isLinux = t3.isWindows = t3.isIphone = t3.isIpad = t3.isMac = t3.getSafariVersion = t3.isSafari = t3.isLegacyEdge = t3.isFirefox = t3.isNode = void 0, t3.isNode = "undefined" != typeof process && "title" in process;
      const i2 = t3.isNode ? "node" : navigator.userAgent, s2 = t3.isNode ? "node" : navigator.platform;
      t3.isFirefox = i2.includes("Firefox"), t3.isLegacyEdge = i2.includes("Edge"), t3.isSafari = /^((?!chrome|android).)*safari/i.test(i2), t3.getSafariVersion = function() {
        if (!t3.isSafari) return 0;
        const e3 = i2.match(/Version\/(\d+)/);
        return null === e3 || e3.length < 2 ? 0 : parseInt(e3[1]);
      }, t3.isMac = ["Macintosh", "MacIntel", "MacPPC", "Mac68K"].includes(s2), t3.isIpad = "iPad" === s2, t3.isIphone = "iPhone" === s2, t3.isWindows = ["Windows", "Win16", "Win32", "WinCE"].includes(s2), t3.isLinux = s2.indexOf("Linux") >= 0, t3.isChromeOS = /\bCrOS\b/.test(i2);
    }, 6106: (e2, t3) => {
      Object.defineProperty(t3, "__esModule", { value: true }), t3.SortedList = void 0;
      let i2 = 0;
      t3.SortedList = class {
        constructor(e3) {
          this._getKey = e3, this._array = [];
        }
        clear() {
          this._array.length = 0;
        }
        insert(e3) {
          0 !== this._array.length ? (i2 = this._search(this._getKey(e3)), this._array.splice(i2, 0, e3)) : this._array.push(e3);
        }
        delete(e3) {
          if (0 === this._array.length) return false;
          const t4 = this._getKey(e3);
          if (void 0 === t4) return false;
          if (i2 = this._search(t4), -1 === i2) return false;
          if (this._getKey(this._array[i2]) !== t4) return false;
          do {
            if (this._array[i2] === e3) return this._array.splice(i2, 1), true;
          } while (++i2 < this._array.length && this._getKey(this._array[i2]) === t4);
          return false;
        }
        *getKeyIterator(e3) {
          if (0 !== this._array.length && (i2 = this._search(e3), !(i2 < 0 || i2 >= this._array.length) && this._getKey(this._array[i2]) === e3)) do {
            yield this._array[i2];
          } while (++i2 < this._array.length && this._getKey(this._array[i2]) === e3);
        }
        forEachByKey(e3, t4) {
          if (0 !== this._array.length && (i2 = this._search(e3), !(i2 < 0 || i2 >= this._array.length) && this._getKey(this._array[i2]) === e3)) do {
            t4(this._array[i2]);
          } while (++i2 < this._array.length && this._getKey(this._array[i2]) === e3);
        }
        values() {
          return [...this._array].values();
        }
        _search(e3) {
          let t4 = 0, i3 = this._array.length - 1;
          for (; i3 >= t4; ) {
            let s2 = t4 + i3 >> 1;
            const r2 = this._getKey(this._array[s2]);
            if (r2 > e3) i3 = s2 - 1;
            else {
              if (!(r2 < e3)) {
                for (; s2 > 0 && this._getKey(this._array[s2 - 1]) === e3; ) s2--;
                return s2;
              }
              t4 = s2 + 1;
            }
          }
          return t4;
        }
      };
    }, 7226: (e2, t3, i2) => {
      Object.defineProperty(t3, "__esModule", { value: true }), t3.DebouncedIdleTask = t3.IdleTaskQueue = t3.PriorityTaskQueue = void 0;
      const s2 = i2(6114);
      class r2 {
        constructor() {
          this._tasks = [], this._i = 0;
        }
        enqueue(e3) {
          this._tasks.push(e3), this._start();
        }
        flush() {
          for (; this._i < this._tasks.length; ) this._tasks[this._i]() || this._i++;
          this.clear();
        }
        clear() {
          this._idleCallback && (this._cancelCallback(this._idleCallback), this._idleCallback = void 0), this._i = 0, this._tasks.length = 0;
        }
        _start() {
          this._idleCallback || (this._idleCallback = this._requestCallback(this._process.bind(this)));
        }
        _process(e3) {
          this._idleCallback = void 0;
          let t4 = 0, i3 = 0, s3 = e3.timeRemaining(), r3 = 0;
          for (; this._i < this._tasks.length; ) {
            if (t4 = Date.now(), this._tasks[this._i]() || this._i++, t4 = Math.max(1, Date.now() - t4), i3 = Math.max(t4, i3), r3 = e3.timeRemaining(), 1.5 * i3 > r3) return s3 - t4 < -20 && console.warn(`task queue exceeded allotted deadline by ${Math.abs(Math.round(s3 - t4))}ms`), void this._start();
            s3 = r3;
          }
          this.clear();
        }
      }
      class n2 extends r2 {
        _requestCallback(e3) {
          return setTimeout(() => e3(this._createDeadline(16)));
        }
        _cancelCallback(e3) {
          clearTimeout(e3);
        }
        _createDeadline(e3) {
          const t4 = Date.now() + e3;
          return { timeRemaining: () => Math.max(0, t4 - Date.now()) };
        }
      }
      t3.PriorityTaskQueue = n2, t3.IdleTaskQueue = !s2.isNode && "requestIdleCallback" in window ? class extends r2 {
        _requestCallback(e3) {
          return requestIdleCallback(e3);
        }
        _cancelCallback(e3) {
          cancelIdleCallback(e3);
        }
      } : n2, t3.DebouncedIdleTask = class {
        constructor() {
          this._queue = new t3.IdleTaskQueue();
        }
        set(e3) {
          this._queue.clear(), this._queue.enqueue(e3);
        }
        flush() {
          this._queue.flush();
        }
      };
    }, 9282: (e2, t3, i2) => {
      Object.defineProperty(t3, "__esModule", { value: true }), t3.updateWindowsModeWrappedState = void 0;
      const s2 = i2(643);
      t3.updateWindowsModeWrappedState = function(e3) {
        const t4 = e3.buffer.lines.get(e3.buffer.ybase + e3.buffer.y - 1), i3 = t4?.get(e3.cols - 1), r2 = e3.buffer.lines.get(e3.buffer.ybase + e3.buffer.y);
        r2 && i3 && (r2.isWrapped = i3[s2.CHAR_DATA_CODE_INDEX] !== s2.NULL_CELL_CODE && i3[s2.CHAR_DATA_CODE_INDEX] !== s2.WHITESPACE_CELL_CODE);
      };
    }, 3734: (e2, t3) => {
      Object.defineProperty(t3, "__esModule", { value: true }), t3.ExtendedAttrs = t3.AttributeData = void 0;
      class i2 {
        constructor() {
          this.fg = 0, this.bg = 0, this.extended = new s2();
        }
        static toColorRGB(e3) {
          return [e3 >>> 16 & 255, e3 >>> 8 & 255, 255 & e3];
        }
        static fromColorRGB(e3) {
          return (255 & e3[0]) << 16 | (255 & e3[1]) << 8 | 255 & e3[2];
        }
        clone() {
          const e3 = new i2();
          return e3.fg = this.fg, e3.bg = this.bg, e3.extended = this.extended.clone(), e3;
        }
        isInverse() {
          return 67108864 & this.fg;
        }
        isBold() {
          return 134217728 & this.fg;
        }
        isUnderline() {
          return this.hasExtendedAttrs() && 0 !== this.extended.underlineStyle ? 1 : 268435456 & this.fg;
        }
        isBlink() {
          return 536870912 & this.fg;
        }
        isInvisible() {
          return 1073741824 & this.fg;
        }
        isItalic() {
          return 67108864 & this.bg;
        }
        isDim() {
          return 134217728 & this.bg;
        }
        isStrikethrough() {
          return 2147483648 & this.fg;
        }
        isProtected() {
          return 536870912 & this.bg;
        }
        isOverline() {
          return 1073741824 & this.bg;
        }
        getFgColorMode() {
          return 50331648 & this.fg;
        }
        getBgColorMode() {
          return 50331648 & this.bg;
        }
        isFgRGB() {
          return 50331648 == (50331648 & this.fg);
        }
        isBgRGB() {
          return 50331648 == (50331648 & this.bg);
        }
        isFgPalette() {
          return 16777216 == (50331648 & this.fg) || 33554432 == (50331648 & this.fg);
        }
        isBgPalette() {
          return 16777216 == (50331648 & this.bg) || 33554432 == (50331648 & this.bg);
        }
        isFgDefault() {
          return 0 == (50331648 & this.fg);
        }
        isBgDefault() {
          return 0 == (50331648 & this.bg);
        }
        isAttributeDefault() {
          return 0 === this.fg && 0 === this.bg;
        }
        getFgColor() {
          switch (50331648 & this.fg) {
            case 16777216:
            case 33554432:
              return 255 & this.fg;
            case 50331648:
              return 16777215 & this.fg;
            default:
              return -1;
          }
        }
        getBgColor() {
          switch (50331648 & this.bg) {
            case 16777216:
            case 33554432:
              return 255 & this.bg;
            case 50331648:
              return 16777215 & this.bg;
            default:
              return -1;
          }
        }
        hasExtendedAttrs() {
          return 268435456 & this.bg;
        }
        updateExtended() {
          this.extended.isEmpty() ? this.bg &= -268435457 : this.bg |= 268435456;
        }
        getUnderlineColor() {
          if (268435456 & this.bg && ~this.extended.underlineColor) switch (50331648 & this.extended.underlineColor) {
            case 16777216:
            case 33554432:
              return 255 & this.extended.underlineColor;
            case 50331648:
              return 16777215 & this.extended.underlineColor;
            default:
              return this.getFgColor();
          }
          return this.getFgColor();
        }
        getUnderlineColorMode() {
          return 268435456 & this.bg && ~this.extended.underlineColor ? 50331648 & this.extended.underlineColor : this.getFgColorMode();
        }
        isUnderlineColorRGB() {
          return 268435456 & this.bg && ~this.extended.underlineColor ? 50331648 == (50331648 & this.extended.underlineColor) : this.isFgRGB();
        }
        isUnderlineColorPalette() {
          return 268435456 & this.bg && ~this.extended.underlineColor ? 16777216 == (50331648 & this.extended.underlineColor) || 33554432 == (50331648 & this.extended.underlineColor) : this.isFgPalette();
        }
        isUnderlineColorDefault() {
          return 268435456 & this.bg && ~this.extended.underlineColor ? 0 == (50331648 & this.extended.underlineColor) : this.isFgDefault();
        }
        getUnderlineStyle() {
          return 268435456 & this.fg ? 268435456 & this.bg ? this.extended.underlineStyle : 1 : 0;
        }
        getUnderlineVariantOffset() {
          return this.extended.underlineVariantOffset;
        }
      }
      t3.AttributeData = i2;
      class s2 {
        get ext() {
          return this._urlId ? -469762049 & this._ext | this.underlineStyle << 26 : this._ext;
        }
        set ext(e3) {
          this._ext = e3;
        }
        get underlineStyle() {
          return this._urlId ? 5 : (469762048 & this._ext) >> 26;
        }
        set underlineStyle(e3) {
          this._ext &= -469762049, this._ext |= e3 << 26 & 469762048;
        }
        get underlineColor() {
          return 67108863 & this._ext;
        }
        set underlineColor(e3) {
          this._ext &= -67108864, this._ext |= 67108863 & e3;
        }
        get urlId() {
          return this._urlId;
        }
        set urlId(e3) {
          this._urlId = e3;
        }
        get underlineVariantOffset() {
          const e3 = (3758096384 & this._ext) >> 29;
          return e3 < 0 ? 4294967288 ^ e3 : e3;
        }
        set underlineVariantOffset(e3) {
          this._ext &= 536870911, this._ext |= e3 << 29 & 3758096384;
        }
        constructor(e3 = 0, t4 = 0) {
          this._ext = 0, this._urlId = 0, this._ext = e3, this._urlId = t4;
        }
        clone() {
          return new s2(this._ext, this._urlId);
        }
        isEmpty() {
          return 0 === this.underlineStyle && 0 === this._urlId;
        }
      }
      t3.ExtendedAttrs = s2;
    }, 9092: (e2, t3, i2) => {
      Object.defineProperty(t3, "__esModule", { value: true }), t3.Buffer = t3.MAX_BUFFER_SIZE = void 0;
      const s2 = i2(6349), r2 = i2(7226), n2 = i2(3734), o = i2(8437), a = i2(4634), h = i2(511), c = i2(643), l2 = i2(4863), d = i2(7116);
      t3.MAX_BUFFER_SIZE = 4294967295, t3.Buffer = class {
        constructor(e3, t4, i3) {
          this._hasScrollback = e3, this._optionsService = t4, this._bufferService = i3, this.ydisp = 0, this.ybase = 0, this.y = 0, this.x = 0, this.tabs = {}, this.savedY = 0, this.savedX = 0, this.savedCurAttrData = o.DEFAULT_ATTR_DATA.clone(), this.savedCharset = d.DEFAULT_CHARSET, this.markers = [], this._nullCell = h.CellData.fromCharData([0, c.NULL_CELL_CHAR, c.NULL_CELL_WIDTH, c.NULL_CELL_CODE]), this._whitespaceCell = h.CellData.fromCharData([0, c.WHITESPACE_CELL_CHAR, c.WHITESPACE_CELL_WIDTH, c.WHITESPACE_CELL_CODE]), this._isClearing = false, this._memoryCleanupQueue = new r2.IdleTaskQueue(), this._memoryCleanupPosition = 0, this._cols = this._bufferService.cols, this._rows = this._bufferService.rows, this.lines = new s2.CircularList(this._getCorrectBufferLength(this._rows)), this.scrollTop = 0, this.scrollBottom = this._rows - 1, this.setupTabStops();
        }
        getNullCell(e3) {
          return e3 ? (this._nullCell.fg = e3.fg, this._nullCell.bg = e3.bg, this._nullCell.extended = e3.extended) : (this._nullCell.fg = 0, this._nullCell.bg = 0, this._nullCell.extended = new n2.ExtendedAttrs()), this._nullCell;
        }
        getWhitespaceCell(e3) {
          return e3 ? (this._whitespaceCell.fg = e3.fg, this._whitespaceCell.bg = e3.bg, this._whitespaceCell.extended = e3.extended) : (this._whitespaceCell.fg = 0, this._whitespaceCell.bg = 0, this._whitespaceCell.extended = new n2.ExtendedAttrs()), this._whitespaceCell;
        }
        getBlankLine(e3, t4) {
          return new o.BufferLine(this._bufferService.cols, this.getNullCell(e3), t4);
        }
        get hasScrollback() {
          return this._hasScrollback && this.lines.maxLength > this._rows;
        }
        get isCursorInViewport() {
          const e3 = this.ybase + this.y - this.ydisp;
          return e3 >= 0 && e3 < this._rows;
        }
        _getCorrectBufferLength(e3) {
          if (!this._hasScrollback) return e3;
          const i3 = e3 + this._optionsService.rawOptions.scrollback;
          return i3 > t3.MAX_BUFFER_SIZE ? t3.MAX_BUFFER_SIZE : i3;
        }
        fillViewportRows(e3) {
          if (0 === this.lines.length) {
            void 0 === e3 && (e3 = o.DEFAULT_ATTR_DATA);
            let t4 = this._rows;
            for (; t4--; ) this.lines.push(this.getBlankLine(e3));
          }
        }
        clear() {
          this.ydisp = 0, this.ybase = 0, this.y = 0, this.x = 0, this.lines = new s2.CircularList(this._getCorrectBufferLength(this._rows)), this.scrollTop = 0, this.scrollBottom = this._rows - 1, this.setupTabStops();
        }
        resize(e3, t4) {
          const i3 = this.getNullCell(o.DEFAULT_ATTR_DATA);
          let s3 = 0;
          const r3 = this._getCorrectBufferLength(t4);
          if (r3 > this.lines.maxLength && (this.lines.maxLength = r3), this.lines.length > 0) {
            if (this._cols < e3) for (let t5 = 0; t5 < this.lines.length; t5++) s3 += +this.lines.get(t5).resize(e3, i3);
            let n3 = 0;
            if (this._rows < t4) for (let s4 = this._rows; s4 < t4; s4++) this.lines.length < t4 + this.ybase && (this._optionsService.rawOptions.windowsMode || void 0 !== this._optionsService.rawOptions.windowsPty.backend || void 0 !== this._optionsService.rawOptions.windowsPty.buildNumber ? this.lines.push(new o.BufferLine(e3, i3)) : this.ybase > 0 && this.lines.length <= this.ybase + this.y + n3 + 1 ? (this.ybase--, n3++, this.ydisp > 0 && this.ydisp--) : this.lines.push(new o.BufferLine(e3, i3)));
            else for (let e4 = this._rows; e4 > t4; e4--) this.lines.length > t4 + this.ybase && (this.lines.length > this.ybase + this.y + 1 ? this.lines.pop() : (this.ybase++, this.ydisp++));
            if (r3 < this.lines.maxLength) {
              const e4 = this.lines.length - r3;
              e4 > 0 && (this.lines.trimStart(e4), this.ybase = Math.max(this.ybase - e4, 0), this.ydisp = Math.max(this.ydisp - e4, 0), this.savedY = Math.max(this.savedY - e4, 0)), this.lines.maxLength = r3;
            }
            this.x = Math.min(this.x, e3 - 1), this.y = Math.min(this.y, t4 - 1), n3 && (this.y += n3), this.savedX = Math.min(this.savedX, e3 - 1), this.scrollTop = 0;
          }
          if (this.scrollBottom = t4 - 1, this._isReflowEnabled && (this._reflow(e3, t4), this._cols > e3)) for (let t5 = 0; t5 < this.lines.length; t5++) s3 += +this.lines.get(t5).resize(e3, i3);
          this._cols = e3, this._rows = t4, this._memoryCleanupQueue.clear(), s3 > 0.1 * this.lines.length && (this._memoryCleanupPosition = 0, this._memoryCleanupQueue.enqueue(() => this._batchedMemoryCleanup()));
        }
        _batchedMemoryCleanup() {
          let e3 = true;
          this._memoryCleanupPosition >= this.lines.length && (this._memoryCleanupPosition = 0, e3 = false);
          let t4 = 0;
          for (; this._memoryCleanupPosition < this.lines.length; ) if (t4 += this.lines.get(this._memoryCleanupPosition++).cleanupMemory(), t4 > 100) return true;
          return e3;
        }
        get _isReflowEnabled() {
          const e3 = this._optionsService.rawOptions.windowsPty;
          return e3 && e3.buildNumber ? this._hasScrollback && "conpty" === e3.backend && e3.buildNumber >= 21376 : this._hasScrollback && !this._optionsService.rawOptions.windowsMode;
        }
        _reflow(e3, t4) {
          this._cols !== e3 && (e3 > this._cols ? this._reflowLarger(e3, t4) : this._reflowSmaller(e3, t4));
        }
        _reflowLarger(e3, t4) {
          const i3 = (0, a.reflowLargerGetLinesToRemove)(this.lines, this._cols, e3, this.ybase + this.y, this.getNullCell(o.DEFAULT_ATTR_DATA));
          if (i3.length > 0) {
            const s3 = (0, a.reflowLargerCreateNewLayout)(this.lines, i3);
            (0, a.reflowLargerApplyNewLayout)(this.lines, s3.layout), this._reflowLargerAdjustViewport(e3, t4, s3.countRemoved);
          }
        }
        _reflowLargerAdjustViewport(e3, t4, i3) {
          const s3 = this.getNullCell(o.DEFAULT_ATTR_DATA);
          let r3 = i3;
          for (; r3-- > 0; ) 0 === this.ybase ? (this.y > 0 && this.y--, this.lines.length < t4 && this.lines.push(new o.BufferLine(e3, s3))) : (this.ydisp === this.ybase && this.ydisp--, this.ybase--);
          this.savedY = Math.max(this.savedY - i3, 0);
        }
        _reflowSmaller(e3, t4) {
          const i3 = this.getNullCell(o.DEFAULT_ATTR_DATA), s3 = [];
          let r3 = 0;
          for (let n3 = this.lines.length - 1; n3 >= 0; n3--) {
            let h2 = this.lines.get(n3);
            if (!h2 || !h2.isWrapped && h2.getTrimmedLength() <= e3) continue;
            const c2 = [h2];
            for (; h2.isWrapped && n3 > 0; ) h2 = this.lines.get(--n3), c2.unshift(h2);
            const l3 = this.ybase + this.y;
            if (l3 >= n3 && l3 < n3 + c2.length) continue;
            const d2 = c2[c2.length - 1].getTrimmedLength(), _ = (0, a.reflowSmallerGetNewLineLengths)(c2, this._cols, e3), u2 = _.length - c2.length;
            let f2;
            f2 = 0 === this.ybase && this.y !== this.lines.length - 1 ? Math.max(0, this.y - this.lines.maxLength + u2) : Math.max(0, this.lines.length - this.lines.maxLength + u2);
            const v2 = [];
            for (let e4 = 0; e4 < u2; e4++) {
              const e5 = this.getBlankLine(o.DEFAULT_ATTR_DATA, true);
              v2.push(e5);
            }
            v2.length > 0 && (s3.push({ start: n3 + c2.length + r3, newLines: v2 }), r3 += v2.length), c2.push(...v2);
            let p2 = _.length - 1, g = _[p2];
            0 === g && (p2--, g = _[p2]);
            let m2 = c2.length - u2 - 1, S2 = d2;
            for (; m2 >= 0; ) {
              const e4 = Math.min(S2, g);
              if (void 0 === c2[p2]) break;
              if (c2[p2].copyCellsFrom(c2[m2], S2 - e4, g - e4, e4, true), g -= e4, 0 === g && (p2--, g = _[p2]), S2 -= e4, 0 === S2) {
                m2--;
                const e5 = Math.max(m2, 0);
                S2 = (0, a.getWrappedLineTrimmedLength)(c2, e5, this._cols);
              }
            }
            for (let t5 = 0; t5 < c2.length; t5++) _[t5] < e3 && c2[t5].setCell(_[t5], i3);
            let C2 = u2 - f2;
            for (; C2-- > 0; ) 0 === this.ybase ? this.y < t4 - 1 ? (this.y++, this.lines.pop()) : (this.ybase++, this.ydisp++) : this.ybase < Math.min(this.lines.maxLength, this.lines.length + r3) - t4 && (this.ybase === this.ydisp && this.ydisp++, this.ybase++);
            this.savedY = Math.min(this.savedY + u2, this.ybase + t4 - 1);
          }
          if (s3.length > 0) {
            const e4 = [], t5 = [];
            for (let e5 = 0; e5 < this.lines.length; e5++) t5.push(this.lines.get(e5));
            const i4 = this.lines.length;
            let n3 = i4 - 1, o2 = 0, a2 = s3[o2];
            this.lines.length = Math.min(this.lines.maxLength, this.lines.length + r3);
            let h2 = 0;
            for (let c3 = Math.min(this.lines.maxLength - 1, i4 + r3 - 1); c3 >= 0; c3--) if (a2 && a2.start > n3 + h2) {
              for (let e5 = a2.newLines.length - 1; e5 >= 0; e5--) this.lines.set(c3--, a2.newLines[e5]);
              c3++, e4.push({ index: n3 + 1, amount: a2.newLines.length }), h2 += a2.newLines.length, a2 = s3[++o2];
            } else this.lines.set(c3, t5[n3--]);
            let c2 = 0;
            for (let t6 = e4.length - 1; t6 >= 0; t6--) e4[t6].index += c2, this.lines.onInsertEmitter.fire(e4[t6]), c2 += e4[t6].amount;
            const l3 = Math.max(0, i4 + r3 - this.lines.maxLength);
            l3 > 0 && this.lines.onTrimEmitter.fire(l3);
          }
        }
        translateBufferLineToString(e3, t4, i3 = 0, s3) {
          const r3 = this.lines.get(e3);
          return r3 ? r3.translateToString(t4, i3, s3) : "";
        }
        getWrappedRangeForLine(e3) {
          let t4 = e3, i3 = e3;
          for (; t4 > 0 && this.lines.get(t4).isWrapped; ) t4--;
          for (; i3 + 1 < this.lines.length && this.lines.get(i3 + 1).isWrapped; ) i3++;
          return { first: t4, last: i3 };
        }
        setupTabStops(e3) {
          for (null != e3 ? this.tabs[e3] || (e3 = this.prevStop(e3)) : (this.tabs = {}, e3 = 0); e3 < this._cols; e3 += this._optionsService.rawOptions.tabStopWidth) this.tabs[e3] = true;
        }
        prevStop(e3) {
          for (null == e3 && (e3 = this.x); !this.tabs[--e3] && e3 > 0; ) ;
          return e3 >= this._cols ? this._cols - 1 : e3 < 0 ? 0 : e3;
        }
        nextStop(e3) {
          for (null == e3 && (e3 = this.x); !this.tabs[++e3] && e3 < this._cols; ) ;
          return e3 >= this._cols ? this._cols - 1 : e3 < 0 ? 0 : e3;
        }
        clearMarkers(e3) {
          this._isClearing = true;
          for (let t4 = 0; t4 < this.markers.length; t4++) this.markers[t4].line === e3 && (this.markers[t4].dispose(), this.markers.splice(t4--, 1));
          this._isClearing = false;
        }
        clearAllMarkers() {
          this._isClearing = true;
          for (let e3 = 0; e3 < this.markers.length; e3++) this.markers[e3].dispose(), this.markers.splice(e3--, 1);
          this._isClearing = false;
        }
        addMarker(e3) {
          const t4 = new l2.Marker(e3);
          return this.markers.push(t4), t4.register(this.lines.onTrim((e4) => {
            t4.line -= e4, t4.line < 0 && t4.dispose();
          })), t4.register(this.lines.onInsert((e4) => {
            t4.line >= e4.index && (t4.line += e4.amount);
          })), t4.register(this.lines.onDelete((e4) => {
            t4.line >= e4.index && t4.line < e4.index + e4.amount && t4.dispose(), t4.line > e4.index && (t4.line -= e4.amount);
          })), t4.register(t4.onDispose(() => this._removeMarker(t4))), t4;
        }
        _removeMarker(e3) {
          this._isClearing || this.markers.splice(this.markers.indexOf(e3), 1);
        }
      };
    }, 8437: (e2, t3, i2) => {
      Object.defineProperty(t3, "__esModule", { value: true }), t3.BufferLine = t3.DEFAULT_ATTR_DATA = void 0;
      const s2 = i2(3734), r2 = i2(511), n2 = i2(643), o = i2(482);
      t3.DEFAULT_ATTR_DATA = Object.freeze(new s2.AttributeData());
      let a = 0;
      class h {
        constructor(e3, t4, i3 = false) {
          this.isWrapped = i3, this._combined = {}, this._extendedAttrs = {}, this._data = new Uint32Array(3 * e3);
          const s3 = t4 || r2.CellData.fromCharData([0, n2.NULL_CELL_CHAR, n2.NULL_CELL_WIDTH, n2.NULL_CELL_CODE]);
          for (let t5 = 0; t5 < e3; ++t5) this.setCell(t5, s3);
          this.length = e3;
        }
        get(e3) {
          const t4 = this._data[3 * e3 + 0], i3 = 2097151 & t4;
          return [this._data[3 * e3 + 1], 2097152 & t4 ? this._combined[e3] : i3 ? (0, o.stringFromCodePoint)(i3) : "", t4 >> 22, 2097152 & t4 ? this._combined[e3].charCodeAt(this._combined[e3].length - 1) : i3];
        }
        set(e3, t4) {
          this._data[3 * e3 + 1] = t4[n2.CHAR_DATA_ATTR_INDEX], t4[n2.CHAR_DATA_CHAR_INDEX].length > 1 ? (this._combined[e3] = t4[1], this._data[3 * e3 + 0] = 2097152 | e3 | t4[n2.CHAR_DATA_WIDTH_INDEX] << 22) : this._data[3 * e3 + 0] = t4[n2.CHAR_DATA_CHAR_INDEX].charCodeAt(0) | t4[n2.CHAR_DATA_WIDTH_INDEX] << 22;
        }
        getWidth(e3) {
          return this._data[3 * e3 + 0] >> 22;
        }
        hasWidth(e3) {
          return 12582912 & this._data[3 * e3 + 0];
        }
        getFg(e3) {
          return this._data[3 * e3 + 1];
        }
        getBg(e3) {
          return this._data[3 * e3 + 2];
        }
        hasContent(e3) {
          return 4194303 & this._data[3 * e3 + 0];
        }
        getCodePoint(e3) {
          const t4 = this._data[3 * e3 + 0];
          return 2097152 & t4 ? this._combined[e3].charCodeAt(this._combined[e3].length - 1) : 2097151 & t4;
        }
        isCombined(e3) {
          return 2097152 & this._data[3 * e3 + 0];
        }
        getString(e3) {
          const t4 = this._data[3 * e3 + 0];
          return 2097152 & t4 ? this._combined[e3] : 2097151 & t4 ? (0, o.stringFromCodePoint)(2097151 & t4) : "";
        }
        isProtected(e3) {
          return 536870912 & this._data[3 * e3 + 2];
        }
        loadCell(e3, t4) {
          return a = 3 * e3, t4.content = this._data[a + 0], t4.fg = this._data[a + 1], t4.bg = this._data[a + 2], 2097152 & t4.content && (t4.combinedData = this._combined[e3]), 268435456 & t4.bg && (t4.extended = this._extendedAttrs[e3]), t4;
        }
        setCell(e3, t4) {
          2097152 & t4.content && (this._combined[e3] = t4.combinedData), 268435456 & t4.bg && (this._extendedAttrs[e3] = t4.extended), this._data[3 * e3 + 0] = t4.content, this._data[3 * e3 + 1] = t4.fg, this._data[3 * e3 + 2] = t4.bg;
        }
        setCellFromCodepoint(e3, t4, i3, s3) {
          268435456 & s3.bg && (this._extendedAttrs[e3] = s3.extended), this._data[3 * e3 + 0] = t4 | i3 << 22, this._data[3 * e3 + 1] = s3.fg, this._data[3 * e3 + 2] = s3.bg;
        }
        addCodepointToCell(e3, t4, i3) {
          let s3 = this._data[3 * e3 + 0];
          2097152 & s3 ? this._combined[e3] += (0, o.stringFromCodePoint)(t4) : 2097151 & s3 ? (this._combined[e3] = (0, o.stringFromCodePoint)(2097151 & s3) + (0, o.stringFromCodePoint)(t4), s3 &= -2097152, s3 |= 2097152) : s3 = t4 | 1 << 22, i3 && (s3 &= -12582913, s3 |= i3 << 22), this._data[3 * e3 + 0] = s3;
        }
        insertCells(e3, t4, i3) {
          if ((e3 %= this.length) && 2 === this.getWidth(e3 - 1) && this.setCellFromCodepoint(e3 - 1, 0, 1, i3), t4 < this.length - e3) {
            const s3 = new r2.CellData();
            for (let i4 = this.length - e3 - t4 - 1; i4 >= 0; --i4) this.setCell(e3 + t4 + i4, this.loadCell(e3 + i4, s3));
            for (let s4 = 0; s4 < t4; ++s4) this.setCell(e3 + s4, i3);
          } else for (let t5 = e3; t5 < this.length; ++t5) this.setCell(t5, i3);
          2 === this.getWidth(this.length - 1) && this.setCellFromCodepoint(this.length - 1, 0, 1, i3);
        }
        deleteCells(e3, t4, i3) {
          if (e3 %= this.length, t4 < this.length - e3) {
            const s3 = new r2.CellData();
            for (let i4 = 0; i4 < this.length - e3 - t4; ++i4) this.setCell(e3 + i4, this.loadCell(e3 + t4 + i4, s3));
            for (let e4 = this.length - t4; e4 < this.length; ++e4) this.setCell(e4, i3);
          } else for (let t5 = e3; t5 < this.length; ++t5) this.setCell(t5, i3);
          e3 && 2 === this.getWidth(e3 - 1) && this.setCellFromCodepoint(e3 - 1, 0, 1, i3), 0 !== this.getWidth(e3) || this.hasContent(e3) || this.setCellFromCodepoint(e3, 0, 1, i3);
        }
        replaceCells(e3, t4, i3, s3 = false) {
          if (s3) for (e3 && 2 === this.getWidth(e3 - 1) && !this.isProtected(e3 - 1) && this.setCellFromCodepoint(e3 - 1, 0, 1, i3), t4 < this.length && 2 === this.getWidth(t4 - 1) && !this.isProtected(t4) && this.setCellFromCodepoint(t4, 0, 1, i3); e3 < t4 && e3 < this.length; ) this.isProtected(e3) || this.setCell(e3, i3), e3++;
          else for (e3 && 2 === this.getWidth(e3 - 1) && this.setCellFromCodepoint(e3 - 1, 0, 1, i3), t4 < this.length && 2 === this.getWidth(t4 - 1) && this.setCellFromCodepoint(t4, 0, 1, i3); e3 < t4 && e3 < this.length; ) this.setCell(e3++, i3);
        }
        resize(e3, t4) {
          if (e3 === this.length) return 4 * this._data.length * 2 < this._data.buffer.byteLength;
          const i3 = 3 * e3;
          if (e3 > this.length) {
            if (this._data.buffer.byteLength >= 4 * i3) this._data = new Uint32Array(this._data.buffer, 0, i3);
            else {
              const e4 = new Uint32Array(i3);
              e4.set(this._data), this._data = e4;
            }
            for (let i4 = this.length; i4 < e3; ++i4) this.setCell(i4, t4);
          } else {
            this._data = this._data.subarray(0, i3);
            const t5 = Object.keys(this._combined);
            for (let i4 = 0; i4 < t5.length; i4++) {
              const s4 = parseInt(t5[i4], 10);
              s4 >= e3 && delete this._combined[s4];
            }
            const s3 = Object.keys(this._extendedAttrs);
            for (let t6 = 0; t6 < s3.length; t6++) {
              const i4 = parseInt(s3[t6], 10);
              i4 >= e3 && delete this._extendedAttrs[i4];
            }
          }
          return this.length = e3, 4 * i3 * 2 < this._data.buffer.byteLength;
        }
        cleanupMemory() {
          if (4 * this._data.length * 2 < this._data.buffer.byteLength) {
            const e3 = new Uint32Array(this._data.length);
            return e3.set(this._data), this._data = e3, 1;
          }
          return 0;
        }
        fill(e3, t4 = false) {
          if (t4) for (let t5 = 0; t5 < this.length; ++t5) this.isProtected(t5) || this.setCell(t5, e3);
          else {
            this._combined = {}, this._extendedAttrs = {};
            for (let t5 = 0; t5 < this.length; ++t5) this.setCell(t5, e3);
          }
        }
        copyFrom(e3) {
          this.length !== e3.length ? this._data = new Uint32Array(e3._data) : this._data.set(e3._data), this.length = e3.length, this._combined = {};
          for (const t4 in e3._combined) this._combined[t4] = e3._combined[t4];
          this._extendedAttrs = {};
          for (const t4 in e3._extendedAttrs) this._extendedAttrs[t4] = e3._extendedAttrs[t4];
          this.isWrapped = e3.isWrapped;
        }
        clone() {
          const e3 = new h(0);
          e3._data = new Uint32Array(this._data), e3.length = this.length;
          for (const t4 in this._combined) e3._combined[t4] = this._combined[t4];
          for (const t4 in this._extendedAttrs) e3._extendedAttrs[t4] = this._extendedAttrs[t4];
          return e3.isWrapped = this.isWrapped, e3;
        }
        getTrimmedLength() {
          for (let e3 = this.length - 1; e3 >= 0; --e3) if (4194303 & this._data[3 * e3 + 0]) return e3 + (this._data[3 * e3 + 0] >> 22);
          return 0;
        }
        getNoBgTrimmedLength() {
          for (let e3 = this.length - 1; e3 >= 0; --e3) if (4194303 & this._data[3 * e3 + 0] || 50331648 & this._data[3 * e3 + 2]) return e3 + (this._data[3 * e3 + 0] >> 22);
          return 0;
        }
        copyCellsFrom(e3, t4, i3, s3, r3) {
          const n3 = e3._data;
          if (r3) for (let r4 = s3 - 1; r4 >= 0; r4--) {
            for (let e4 = 0; e4 < 3; e4++) this._data[3 * (i3 + r4) + e4] = n3[3 * (t4 + r4) + e4];
            268435456 & n3[3 * (t4 + r4) + 2] && (this._extendedAttrs[i3 + r4] = e3._extendedAttrs[t4 + r4]);
          }
          else for (let r4 = 0; r4 < s3; r4++) {
            for (let e4 = 0; e4 < 3; e4++) this._data[3 * (i3 + r4) + e4] = n3[3 * (t4 + r4) + e4];
            268435456 & n3[3 * (t4 + r4) + 2] && (this._extendedAttrs[i3 + r4] = e3._extendedAttrs[t4 + r4]);
          }
          const o2 = Object.keys(e3._combined);
          for (let s4 = 0; s4 < o2.length; s4++) {
            const r4 = parseInt(o2[s4], 10);
            r4 >= t4 && (this._combined[r4 - t4 + i3] = e3._combined[r4]);
          }
        }
        translateToString(e3, t4, i3, s3) {
          t4 = t4 ?? 0, i3 = i3 ?? this.length, e3 && (i3 = Math.min(i3, this.getTrimmedLength())), s3 && (s3.length = 0);
          let r3 = "";
          for (; t4 < i3; ) {
            const e4 = this._data[3 * t4 + 0], i4 = 2097151 & e4, a2 = 2097152 & e4 ? this._combined[t4] : i4 ? (0, o.stringFromCodePoint)(i4) : n2.WHITESPACE_CELL_CHAR;
            if (r3 += a2, s3) for (let e5 = 0; e5 < a2.length; ++e5) s3.push(t4);
            t4 += e4 >> 22 || 1;
          }
          return s3 && s3.push(t4), r3;
        }
      }
      t3.BufferLine = h;
    }, 4841: (e2, t3) => {
      Object.defineProperty(t3, "__esModule", { value: true }), t3.getRangeLength = void 0, t3.getRangeLength = function(e3, t4) {
        if (e3.start.y > e3.end.y) throw new Error(`Buffer range end (${e3.end.x}, ${e3.end.y}) cannot be before start (${e3.start.x}, ${e3.start.y})`);
        return t4 * (e3.end.y - e3.start.y) + (e3.end.x - e3.start.x + 1);
      };
    }, 4634: (e2, t3) => {
      function i2(e3, t4, i3) {
        if (t4 === e3.length - 1) return e3[t4].getTrimmedLength();
        const s2 = !e3[t4].hasContent(i3 - 1) && 1 === e3[t4].getWidth(i3 - 1), r2 = 2 === e3[t4 + 1].getWidth(0);
        return s2 && r2 ? i3 - 1 : i3;
      }
      Object.defineProperty(t3, "__esModule", { value: true }), t3.getWrappedLineTrimmedLength = t3.reflowSmallerGetNewLineLengths = t3.reflowLargerApplyNewLayout = t3.reflowLargerCreateNewLayout = t3.reflowLargerGetLinesToRemove = void 0, t3.reflowLargerGetLinesToRemove = function(e3, t4, s2, r2, n2) {
        const o = [];
        for (let a = 0; a < e3.length - 1; a++) {
          let h = a, c = e3.get(++h);
          if (!c.isWrapped) continue;
          const l2 = [e3.get(a)];
          for (; h < e3.length && c.isWrapped; ) l2.push(c), c = e3.get(++h);
          if (r2 >= a && r2 < h) {
            a += l2.length - 1;
            continue;
          }
          let d = 0, _ = i2(l2, d, t4), u2 = 1, f2 = 0;
          for (; u2 < l2.length; ) {
            const e4 = i2(l2, u2, t4), r3 = e4 - f2, o2 = s2 - _, a2 = Math.min(r3, o2);
            l2[d].copyCellsFrom(l2[u2], f2, _, a2, false), _ += a2, _ === s2 && (d++, _ = 0), f2 += a2, f2 === e4 && (u2++, f2 = 0), 0 === _ && 0 !== d && 2 === l2[d - 1].getWidth(s2 - 1) && (l2[d].copyCellsFrom(l2[d - 1], s2 - 1, _++, 1, false), l2[d - 1].setCell(s2 - 1, n2));
          }
          l2[d].replaceCells(_, s2, n2);
          let v2 = 0;
          for (let e4 = l2.length - 1; e4 > 0 && (e4 > d || 0 === l2[e4].getTrimmedLength()); e4--) v2++;
          v2 > 0 && (o.push(a + l2.length - v2), o.push(v2)), a += l2.length - 1;
        }
        return o;
      }, t3.reflowLargerCreateNewLayout = function(e3, t4) {
        const i3 = [];
        let s2 = 0, r2 = t4[s2], n2 = 0;
        for (let o = 0; o < e3.length; o++) if (r2 === o) {
          const i4 = t4[++s2];
          e3.onDeleteEmitter.fire({ index: o - n2, amount: i4 }), o += i4 - 1, n2 += i4, r2 = t4[++s2];
        } else i3.push(o);
        return { layout: i3, countRemoved: n2 };
      }, t3.reflowLargerApplyNewLayout = function(e3, t4) {
        const i3 = [];
        for (let s2 = 0; s2 < t4.length; s2++) i3.push(e3.get(t4[s2]));
        for (let t5 = 0; t5 < i3.length; t5++) e3.set(t5, i3[t5]);
        e3.length = t4.length;
      }, t3.reflowSmallerGetNewLineLengths = function(e3, t4, s2) {
        const r2 = [], n2 = e3.map((s3, r3) => i2(e3, r3, t4)).reduce((e4, t5) => e4 + t5);
        let o = 0, a = 0, h = 0;
        for (; h < n2; ) {
          if (n2 - h < s2) {
            r2.push(n2 - h);
            break;
          }
          o += s2;
          const c = i2(e3, a, t4);
          o > c && (o -= c, a++);
          const l2 = 2 === e3[a].getWidth(o - 1);
          l2 && o--;
          const d = l2 ? s2 - 1 : s2;
          r2.push(d), h += d;
        }
        return r2;
      }, t3.getWrappedLineTrimmedLength = i2;
    }, 5295: (e2, t3, i2) => {
      Object.defineProperty(t3, "__esModule", { value: true }), t3.BufferSet = void 0;
      const s2 = i2(8460), r2 = i2(844), n2 = i2(9092);
      class o extends r2.Disposable {
        constructor(e3, t4) {
          super(), this._optionsService = e3, this._bufferService = t4, this._onBufferActivate = this.register(new s2.EventEmitter()), this.onBufferActivate = this._onBufferActivate.event, this.reset(), this.register(this._optionsService.onSpecificOptionChange("scrollback", () => this.resize(this._bufferService.cols, this._bufferService.rows))), this.register(this._optionsService.onSpecificOptionChange("tabStopWidth", () => this.setupTabStops()));
        }
        reset() {
          this._normal = new n2.Buffer(true, this._optionsService, this._bufferService), this._normal.fillViewportRows(), this._alt = new n2.Buffer(false, this._optionsService, this._bufferService), this._activeBuffer = this._normal, this._onBufferActivate.fire({ activeBuffer: this._normal, inactiveBuffer: this._alt }), this.setupTabStops();
        }
        get alt() {
          return this._alt;
        }
        get active() {
          return this._activeBuffer;
        }
        get normal() {
          return this._normal;
        }
        activateNormalBuffer() {
          this._activeBuffer !== this._normal && (this._normal.x = this._alt.x, this._normal.y = this._alt.y, this._alt.clearAllMarkers(), this._alt.clear(), this._activeBuffer = this._normal, this._onBufferActivate.fire({ activeBuffer: this._normal, inactiveBuffer: this._alt }));
        }
        activateAltBuffer(e3) {
          this._activeBuffer !== this._alt && (this._alt.fillViewportRows(e3), this._alt.x = this._normal.x, this._alt.y = this._normal.y, this._activeBuffer = this._alt, this._onBufferActivate.fire({ activeBuffer: this._alt, inactiveBuffer: this._normal }));
        }
        resize(e3, t4) {
          this._normal.resize(e3, t4), this._alt.resize(e3, t4), this.setupTabStops(e3);
        }
        setupTabStops(e3) {
          this._normal.setupTabStops(e3), this._alt.setupTabStops(e3);
        }
      }
      t3.BufferSet = o;
    }, 511: (e2, t3, i2) => {
      Object.defineProperty(t3, "__esModule", { value: true }), t3.CellData = void 0;
      const s2 = i2(482), r2 = i2(643), n2 = i2(3734);
      class o extends n2.AttributeData {
        constructor() {
          super(...arguments), this.content = 0, this.fg = 0, this.bg = 0, this.extended = new n2.ExtendedAttrs(), this.combinedData = "";
        }
        static fromCharData(e3) {
          const t4 = new o();
          return t4.setFromCharData(e3), t4;
        }
        isCombined() {
          return 2097152 & this.content;
        }
        getWidth() {
          return this.content >> 22;
        }
        getChars() {
          return 2097152 & this.content ? this.combinedData : 2097151 & this.content ? (0, s2.stringFromCodePoint)(2097151 & this.content) : "";
        }
        getCode() {
          return this.isCombined() ? this.combinedData.charCodeAt(this.combinedData.length - 1) : 2097151 & this.content;
        }
        setFromCharData(e3) {
          this.fg = e3[r2.CHAR_DATA_ATTR_INDEX], this.bg = 0;
          let t4 = false;
          if (e3[r2.CHAR_DATA_CHAR_INDEX].length > 2) t4 = true;
          else if (2 === e3[r2.CHAR_DATA_CHAR_INDEX].length) {
            const i3 = e3[r2.CHAR_DATA_CHAR_INDEX].charCodeAt(0);
            if (55296 <= i3 && i3 <= 56319) {
              const s3 = e3[r2.CHAR_DATA_CHAR_INDEX].charCodeAt(1);
              56320 <= s3 && s3 <= 57343 ? this.content = 1024 * (i3 - 55296) + s3 - 56320 + 65536 | e3[r2.CHAR_DATA_WIDTH_INDEX] << 22 : t4 = true;
            } else t4 = true;
          } else this.content = e3[r2.CHAR_DATA_CHAR_INDEX].charCodeAt(0) | e3[r2.CHAR_DATA_WIDTH_INDEX] << 22;
          t4 && (this.combinedData = e3[r2.CHAR_DATA_CHAR_INDEX], this.content = 2097152 | e3[r2.CHAR_DATA_WIDTH_INDEX] << 22);
        }
        getAsCharData() {
          return [this.fg, this.getChars(), this.getWidth(), this.getCode()];
        }
      }
      t3.CellData = o;
    }, 643: (e2, t3) => {
      Object.defineProperty(t3, "__esModule", { value: true }), t3.WHITESPACE_CELL_CODE = t3.WHITESPACE_CELL_WIDTH = t3.WHITESPACE_CELL_CHAR = t3.NULL_CELL_CODE = t3.NULL_CELL_WIDTH = t3.NULL_CELL_CHAR = t3.CHAR_DATA_CODE_INDEX = t3.CHAR_DATA_WIDTH_INDEX = t3.CHAR_DATA_CHAR_INDEX = t3.CHAR_DATA_ATTR_INDEX = t3.DEFAULT_EXT = t3.DEFAULT_ATTR = t3.DEFAULT_COLOR = void 0, t3.DEFAULT_COLOR = 0, t3.DEFAULT_ATTR = 256 | t3.DEFAULT_COLOR << 9, t3.DEFAULT_EXT = 0, t3.CHAR_DATA_ATTR_INDEX = 0, t3.CHAR_DATA_CHAR_INDEX = 1, t3.CHAR_DATA_WIDTH_INDEX = 2, t3.CHAR_DATA_CODE_INDEX = 3, t3.NULL_CELL_CHAR = "", t3.NULL_CELL_WIDTH = 1, t3.NULL_CELL_CODE = 0, t3.WHITESPACE_CELL_CHAR = " ", t3.WHITESPACE_CELL_WIDTH = 1, t3.WHITESPACE_CELL_CODE = 32;
    }, 4863: (e2, t3, i2) => {
      Object.defineProperty(t3, "__esModule", { value: true }), t3.Marker = void 0;
      const s2 = i2(8460), r2 = i2(844);
      class n2 {
        get id() {
          return this._id;
        }
        constructor(e3) {
          this.line = e3, this.isDisposed = false, this._disposables = [], this._id = n2._nextId++, this._onDispose = this.register(new s2.EventEmitter()), this.onDispose = this._onDispose.event;
        }
        dispose() {
          this.isDisposed || (this.isDisposed = true, this.line = -1, this._onDispose.fire(), (0, r2.disposeArray)(this._disposables), this._disposables.length = 0);
        }
        register(e3) {
          return this._disposables.push(e3), e3;
        }
      }
      t3.Marker = n2, n2._nextId = 1;
    }, 7116: (e2, t3) => {
      Object.defineProperty(t3, "__esModule", { value: true }), t3.DEFAULT_CHARSET = t3.CHARSETS = void 0, t3.CHARSETS = {}, t3.DEFAULT_CHARSET = t3.CHARSETS.B, t3.CHARSETS[0] = { "`": "◆", a: "▒", b: "␉", c: "␌", d: "␍", e: "␊", f: "°", g: "±", h: "␤", i: "␋", j: "┘", k: "┐", l: "┌", m: "└", n: "┼", o: "⎺", p: "⎻", q: "─", r: "⎼", s: "⎽", t: "├", u: "┤", v: "┴", w: "┬", x: "│", y: "≤", z: "≥", "{": "π", "|": "≠", "}": "£", "~": "·" }, t3.CHARSETS.A = { "#": "£" }, t3.CHARSETS.B = void 0, t3.CHARSETS[4] = { "#": "£", "@": "¾", "[": "ij", "\\": "½", "]": "|", "{": "¨", "|": "f", "}": "¼", "~": "´" }, t3.CHARSETS.C = t3.CHARSETS[5] = { "[": "Ä", "\\": "Ö", "]": "Å", "^": "Ü", "`": "é", "{": "ä", "|": "ö", "}": "å", "~": "ü" }, t3.CHARSETS.R = { "#": "£", "@": "à", "[": "°", "\\": "ç", "]": "§", "{": "é", "|": "ù", "}": "è", "~": "¨" }, t3.CHARSETS.Q = { "@": "à", "[": "â", "\\": "ç", "]": "ê", "^": "î", "`": "ô", "{": "é", "|": "ù", "}": "è", "~": "û" }, t3.CHARSETS.K = { "@": "§", "[": "Ä", "\\": "Ö", "]": "Ü", "{": "ä", "|": "ö", "}": "ü", "~": "ß" }, t3.CHARSETS.Y = { "#": "£", "@": "§", "[": "°", "\\": "ç", "]": "é", "`": "ù", "{": "à", "|": "ò", "}": "è", "~": "ì" }, t3.CHARSETS.E = t3.CHARSETS[6] = { "@": "Ä", "[": "Æ", "\\": "Ø", "]": "Å", "^": "Ü", "`": "ä", "{": "æ", "|": "ø", "}": "å", "~": "ü" }, t3.CHARSETS.Z = { "#": "£", "@": "§", "[": "¡", "\\": "Ñ", "]": "¿", "{": "°", "|": "ñ", "}": "ç" }, t3.CHARSETS.H = t3.CHARSETS[7] = { "@": "É", "[": "Ä", "\\": "Ö", "]": "Å", "^": "Ü", "`": "é", "{": "ä", "|": "ö", "}": "å", "~": "ü" }, t3.CHARSETS["="] = { "#": "ù", "@": "à", "[": "é", "\\": "ç", "]": "ê", "^": "î", _: "è", "`": "ô", "{": "ä", "|": "ö", "}": "ü", "~": "û" };
    }, 2584: (e2, t3) => {
      var i2, s2, r2;
      Object.defineProperty(t3, "__esModule", { value: true }), t3.C1_ESCAPED = t3.C1 = t3.C0 = void 0, function(e3) {
        e3.NUL = "\0", e3.SOH = "", e3.STX = "", e3.ETX = "", e3.EOT = "", e3.ENQ = "", e3.ACK = "", e3.BEL = "\x07", e3.BS = "\b", e3.HT = "	", e3.LF = "\n", e3.VT = "\v", e3.FF = "\f", e3.CR = "\r", e3.SO = "", e3.SI = "", e3.DLE = "", e3.DC1 = "", e3.DC2 = "", e3.DC3 = "", e3.DC4 = "", e3.NAK = "", e3.SYN = "", e3.ETB = "", e3.CAN = "", e3.EM = "", e3.SUB = "", e3.ESC = "\x1B", e3.FS = "", e3.GS = "", e3.RS = "", e3.US = "", e3.SP = " ", e3.DEL = "";
      }(i2 || (t3.C0 = i2 = {})), function(e3) {
        e3.PAD = "", e3.HOP = "", e3.BPH = "", e3.NBH = "", e3.IND = "", e3.NEL = "", e3.SSA = "", e3.ESA = "", e3.HTS = "", e3.HTJ = "", e3.VTS = "", e3.PLD = "", e3.PLU = "", e3.RI = "", e3.SS2 = "", e3.SS3 = "", e3.DCS = "", e3.PU1 = "", e3.PU2 = "", e3.STS = "", e3.CCH = "", e3.MW = "", e3.SPA = "", e3.EPA = "", e3.SOS = "", e3.SGCI = "", e3.SCI = "", e3.CSI = "", e3.ST = "", e3.OSC = "", e3.PM = "", e3.APC = "";
      }(s2 || (t3.C1 = s2 = {})), function(e3) {
        e3.ST = `${i2.ESC}\\`;
      }(r2 || (t3.C1_ESCAPED = r2 = {}));
    }, 7399: (e2, t3, i2) => {
      Object.defineProperty(t3, "__esModule", { value: true }), t3.evaluateKeyboardEvent = void 0;
      const s2 = i2(2584), r2 = { 48: ["0", ")"], 49: ["1", "!"], 50: ["2", "@"], 51: ["3", "#"], 52: ["4", "$"], 53: ["5", "%"], 54: ["6", "^"], 55: ["7", "&"], 56: ["8", "*"], 57: ["9", "("], 186: [";", ":"], 187: ["=", "+"], 188: [",", "<"], 189: ["-", "_"], 190: [".", ">"], 191: ["/", "?"], 192: ["`", "~"], 219: ["[", "{"], 220: ["\\", "|"], 221: ["]", "}"], 222: ["'", '"'] };
      t3.evaluateKeyboardEvent = function(e3, t4, i3, n2) {
        const o = { type: 0, cancel: false, key: void 0 }, a = (e3.shiftKey ? 1 : 0) | (e3.altKey ? 2 : 0) | (e3.ctrlKey ? 4 : 0) | (e3.metaKey ? 8 : 0);
        switch (e3.keyCode) {
          case 0:
            "UIKeyInputUpArrow" === e3.key ? o.key = t4 ? s2.C0.ESC + "OA" : s2.C0.ESC + "[A" : "UIKeyInputLeftArrow" === e3.key ? o.key = t4 ? s2.C0.ESC + "OD" : s2.C0.ESC + "[D" : "UIKeyInputRightArrow" === e3.key ? o.key = t4 ? s2.C0.ESC + "OC" : s2.C0.ESC + "[C" : "UIKeyInputDownArrow" === e3.key && (o.key = t4 ? s2.C0.ESC + "OB" : s2.C0.ESC + "[B");
            break;
          case 8:
            o.key = e3.ctrlKey ? "\b" : s2.C0.DEL, e3.altKey && (o.key = s2.C0.ESC + o.key);
            break;
          case 9:
            if (e3.shiftKey) {
              o.key = s2.C0.ESC + "[Z";
              break;
            }
            o.key = s2.C0.HT, o.cancel = true;
            break;
          case 13:
            o.key = e3.altKey ? s2.C0.ESC + s2.C0.CR : s2.C0.CR, o.cancel = true;
            break;
          case 27:
            o.key = s2.C0.ESC, e3.altKey && (o.key = s2.C0.ESC + s2.C0.ESC), o.cancel = true;
            break;
          case 37:
            if (e3.metaKey) break;
            a ? (o.key = s2.C0.ESC + "[1;" + (a + 1) + "D", o.key === s2.C0.ESC + "[1;3D" && (o.key = s2.C0.ESC + (i3 ? "b" : "[1;5D"))) : o.key = t4 ? s2.C0.ESC + "OD" : s2.C0.ESC + "[D";
            break;
          case 39:
            if (e3.metaKey) break;
            a ? (o.key = s2.C0.ESC + "[1;" + (a + 1) + "C", o.key === s2.C0.ESC + "[1;3C" && (o.key = s2.C0.ESC + (i3 ? "f" : "[1;5C"))) : o.key = t4 ? s2.C0.ESC + "OC" : s2.C0.ESC + "[C";
            break;
          case 38:
            if (e3.metaKey) break;
            a ? (o.key = s2.C0.ESC + "[1;" + (a + 1) + "A", i3 || o.key !== s2.C0.ESC + "[1;3A" || (o.key = s2.C0.ESC + "[1;5A")) : o.key = t4 ? s2.C0.ESC + "OA" : s2.C0.ESC + "[A";
            break;
          case 40:
            if (e3.metaKey) break;
            a ? (o.key = s2.C0.ESC + "[1;" + (a + 1) + "B", i3 || o.key !== s2.C0.ESC + "[1;3B" || (o.key = s2.C0.ESC + "[1;5B")) : o.key = t4 ? s2.C0.ESC + "OB" : s2.C0.ESC + "[B";
            break;
          case 45:
            e3.shiftKey || e3.ctrlKey || (o.key = s2.C0.ESC + "[2~");
            break;
          case 46:
            o.key = a ? s2.C0.ESC + "[3;" + (a + 1) + "~" : s2.C0.ESC + "[3~";
            break;
          case 36:
            o.key = a ? s2.C0.ESC + "[1;" + (a + 1) + "H" : t4 ? s2.C0.ESC + "OH" : s2.C0.ESC + "[H";
            break;
          case 35:
            o.key = a ? s2.C0.ESC + "[1;" + (a + 1) + "F" : t4 ? s2.C0.ESC + "OF" : s2.C0.ESC + "[F";
            break;
          case 33:
            e3.shiftKey ? o.type = 2 : e3.ctrlKey ? o.key = s2.C0.ESC + "[5;" + (a + 1) + "~" : o.key = s2.C0.ESC + "[5~";
            break;
          case 34:
            e3.shiftKey ? o.type = 3 : e3.ctrlKey ? o.key = s2.C0.ESC + "[6;" + (a + 1) + "~" : o.key = s2.C0.ESC + "[6~";
            break;
          case 112:
            o.key = a ? s2.C0.ESC + "[1;" + (a + 1) + "P" : s2.C0.ESC + "OP";
            break;
          case 113:
            o.key = a ? s2.C0.ESC + "[1;" + (a + 1) + "Q" : s2.C0.ESC + "OQ";
            break;
          case 114:
            o.key = a ? s2.C0.ESC + "[1;" + (a + 1) + "R" : s2.C0.ESC + "OR";
            break;
          case 115:
            o.key = a ? s2.C0.ESC + "[1;" + (a + 1) + "S" : s2.C0.ESC + "OS";
            break;
          case 116:
            o.key = a ? s2.C0.ESC + "[15;" + (a + 1) + "~" : s2.C0.ESC + "[15~";
            break;
          case 117:
            o.key = a ? s2.C0.ESC + "[17;" + (a + 1) + "~" : s2.C0.ESC + "[17~";
            break;
          case 118:
            o.key = a ? s2.C0.ESC + "[18;" + (a + 1) + "~" : s2.C0.ESC + "[18~";
            break;
          case 119:
            o.key = a ? s2.C0.ESC + "[19;" + (a + 1) + "~" : s2.C0.ESC + "[19~";
            break;
          case 120:
            o.key = a ? s2.C0.ESC + "[20;" + (a + 1) + "~" : s2.C0.ESC + "[20~";
            break;
          case 121:
            o.key = a ? s2.C0.ESC + "[21;" + (a + 1) + "~" : s2.C0.ESC + "[21~";
            break;
          case 122:
            o.key = a ? s2.C0.ESC + "[23;" + (a + 1) + "~" : s2.C0.ESC + "[23~";
            break;
          case 123:
            o.key = a ? s2.C0.ESC + "[24;" + (a + 1) + "~" : s2.C0.ESC + "[24~";
            break;
          default:
            if (!e3.ctrlKey || e3.shiftKey || e3.altKey || e3.metaKey) if (i3 && !n2 || !e3.altKey || e3.metaKey) !i3 || e3.altKey || e3.ctrlKey || e3.shiftKey || !e3.metaKey ? e3.key && !e3.ctrlKey && !e3.altKey && !e3.metaKey && e3.keyCode >= 48 && 1 === e3.key.length ? o.key = e3.key : e3.key && e3.ctrlKey && ("_" === e3.key && (o.key = s2.C0.US), "@" === e3.key && (o.key = s2.C0.NUL)) : 65 === e3.keyCode && (o.type = 1);
            else {
              const t5 = r2[e3.keyCode], i4 = t5?.[e3.shiftKey ? 1 : 0];
              if (i4) o.key = s2.C0.ESC + i4;
              else if (e3.keyCode >= 65 && e3.keyCode <= 90) {
                const t6 = e3.ctrlKey ? e3.keyCode - 64 : e3.keyCode + 32;
                let i5 = String.fromCharCode(t6);
                e3.shiftKey && (i5 = i5.toUpperCase()), o.key = s2.C0.ESC + i5;
              } else if (32 === e3.keyCode) o.key = s2.C0.ESC + (e3.ctrlKey ? s2.C0.NUL : " ");
              else if ("Dead" === e3.key && e3.code.startsWith("Key")) {
                let t6 = e3.code.slice(3, 4);
                e3.shiftKey || (t6 = t6.toLowerCase()), o.key = s2.C0.ESC + t6, o.cancel = true;
              }
            }
            else e3.keyCode >= 65 && e3.keyCode <= 90 ? o.key = String.fromCharCode(e3.keyCode - 64) : 32 === e3.keyCode ? o.key = s2.C0.NUL : e3.keyCode >= 51 && e3.keyCode <= 55 ? o.key = String.fromCharCode(e3.keyCode - 51 + 27) : 56 === e3.keyCode ? o.key = s2.C0.DEL : 219 === e3.keyCode ? o.key = s2.C0.ESC : 220 === e3.keyCode ? o.key = s2.C0.FS : 221 === e3.keyCode && (o.key = s2.C0.GS);
        }
        return o;
      };
    }, 482: (e2, t3) => {
      Object.defineProperty(t3, "__esModule", { value: true }), t3.Utf8ToUtf32 = t3.StringToUtf32 = t3.utf32ToString = t3.stringFromCodePoint = void 0, t3.stringFromCodePoint = function(e3) {
        return e3 > 65535 ? (e3 -= 65536, String.fromCharCode(55296 + (e3 >> 10)) + String.fromCharCode(e3 % 1024 + 56320)) : String.fromCharCode(e3);
      }, t3.utf32ToString = function(e3, t4 = 0, i2 = e3.length) {
        let s2 = "";
        for (let r2 = t4; r2 < i2; ++r2) {
          let t5 = e3[r2];
          t5 > 65535 ? (t5 -= 65536, s2 += String.fromCharCode(55296 + (t5 >> 10)) + String.fromCharCode(t5 % 1024 + 56320)) : s2 += String.fromCharCode(t5);
        }
        return s2;
      }, t3.StringToUtf32 = class {
        constructor() {
          this._interim = 0;
        }
        clear() {
          this._interim = 0;
        }
        decode(e3, t4) {
          const i2 = e3.length;
          if (!i2) return 0;
          let s2 = 0, r2 = 0;
          if (this._interim) {
            const i3 = e3.charCodeAt(r2++);
            56320 <= i3 && i3 <= 57343 ? t4[s2++] = 1024 * (this._interim - 55296) + i3 - 56320 + 65536 : (t4[s2++] = this._interim, t4[s2++] = i3), this._interim = 0;
          }
          for (let n2 = r2; n2 < i2; ++n2) {
            const r3 = e3.charCodeAt(n2);
            if (55296 <= r3 && r3 <= 56319) {
              if (++n2 >= i2) return this._interim = r3, s2;
              const o = e3.charCodeAt(n2);
              56320 <= o && o <= 57343 ? t4[s2++] = 1024 * (r3 - 55296) + o - 56320 + 65536 : (t4[s2++] = r3, t4[s2++] = o);
            } else 65279 !== r3 && (t4[s2++] = r3);
          }
          return s2;
        }
      }, t3.Utf8ToUtf32 = class {
        constructor() {
          this.interim = new Uint8Array(3);
        }
        clear() {
          this.interim.fill(0);
        }
        decode(e3, t4) {
          const i2 = e3.length;
          if (!i2) return 0;
          let s2, r2, n2, o, a = 0, h = 0, c = 0;
          if (this.interim[0]) {
            let s3 = false, r3 = this.interim[0];
            r3 &= 192 == (224 & r3) ? 31 : 224 == (240 & r3) ? 15 : 7;
            let n3, o2 = 0;
            for (; (n3 = 63 & this.interim[++o2]) && o2 < 4; ) r3 <<= 6, r3 |= n3;
            const h2 = 192 == (224 & this.interim[0]) ? 2 : 224 == (240 & this.interim[0]) ? 3 : 4, l3 = h2 - o2;
            for (; c < l3; ) {
              if (c >= i2) return 0;
              if (n3 = e3[c++], 128 != (192 & n3)) {
                c--, s3 = true;
                break;
              }
              this.interim[o2++] = n3, r3 <<= 6, r3 |= 63 & n3;
            }
            s3 || (2 === h2 ? r3 < 128 ? c-- : t4[a++] = r3 : 3 === h2 ? r3 < 2048 || r3 >= 55296 && r3 <= 57343 || 65279 === r3 || (t4[a++] = r3) : r3 < 65536 || r3 > 1114111 || (t4[a++] = r3)), this.interim.fill(0);
          }
          const l2 = i2 - 4;
          let d = c;
          for (; d < i2; ) {
            for (; !(!(d < l2) || 128 & (s2 = e3[d]) || 128 & (r2 = e3[d + 1]) || 128 & (n2 = e3[d + 2]) || 128 & (o = e3[d + 3])); ) t4[a++] = s2, t4[a++] = r2, t4[a++] = n2, t4[a++] = o, d += 4;
            if (s2 = e3[d++], s2 < 128) t4[a++] = s2;
            else if (192 == (224 & s2)) {
              if (d >= i2) return this.interim[0] = s2, a;
              if (r2 = e3[d++], 128 != (192 & r2)) {
                d--;
                continue;
              }
              if (h = (31 & s2) << 6 | 63 & r2, h < 128) {
                d--;
                continue;
              }
              t4[a++] = h;
            } else if (224 == (240 & s2)) {
              if (d >= i2) return this.interim[0] = s2, a;
              if (r2 = e3[d++], 128 != (192 & r2)) {
                d--;
                continue;
              }
              if (d >= i2) return this.interim[0] = s2, this.interim[1] = r2, a;
              if (n2 = e3[d++], 128 != (192 & n2)) {
                d--;
                continue;
              }
              if (h = (15 & s2) << 12 | (63 & r2) << 6 | 63 & n2, h < 2048 || h >= 55296 && h <= 57343 || 65279 === h) continue;
              t4[a++] = h;
            } else if (240 == (248 & s2)) {
              if (d >= i2) return this.interim[0] = s2, a;
              if (r2 = e3[d++], 128 != (192 & r2)) {
                d--;
                continue;
              }
              if (d >= i2) return this.interim[0] = s2, this.interim[1] = r2, a;
              if (n2 = e3[d++], 128 != (192 & n2)) {
                d--;
                continue;
              }
              if (d >= i2) return this.interim[0] = s2, this.interim[1] = r2, this.interim[2] = n2, a;
              if (o = e3[d++], 128 != (192 & o)) {
                d--;
                continue;
              }
              if (h = (7 & s2) << 18 | (63 & r2) << 12 | (63 & n2) << 6 | 63 & o, h < 65536 || h > 1114111) continue;
              t4[a++] = h;
            }
          }
          return a;
        }
      };
    }, 225: (e2, t3, i2) => {
      Object.defineProperty(t3, "__esModule", { value: true }), t3.UnicodeV6 = void 0;
      const s2 = i2(1480), r2 = [[768, 879], [1155, 1158], [1160, 1161], [1425, 1469], [1471, 1471], [1473, 1474], [1476, 1477], [1479, 1479], [1536, 1539], [1552, 1557], [1611, 1630], [1648, 1648], [1750, 1764], [1767, 1768], [1770, 1773], [1807, 1807], [1809, 1809], [1840, 1866], [1958, 1968], [2027, 2035], [2305, 2306], [2364, 2364], [2369, 2376], [2381, 2381], [2385, 2388], [2402, 2403], [2433, 2433], [2492, 2492], [2497, 2500], [2509, 2509], [2530, 2531], [2561, 2562], [2620, 2620], [2625, 2626], [2631, 2632], [2635, 2637], [2672, 2673], [2689, 2690], [2748, 2748], [2753, 2757], [2759, 2760], [2765, 2765], [2786, 2787], [2817, 2817], [2876, 2876], [2879, 2879], [2881, 2883], [2893, 2893], [2902, 2902], [2946, 2946], [3008, 3008], [3021, 3021], [3134, 3136], [3142, 3144], [3146, 3149], [3157, 3158], [3260, 3260], [3263, 3263], [3270, 3270], [3276, 3277], [3298, 3299], [3393, 3395], [3405, 3405], [3530, 3530], [3538, 3540], [3542, 3542], [3633, 3633], [3636, 3642], [3655, 3662], [3761, 3761], [3764, 3769], [3771, 3772], [3784, 3789], [3864, 3865], [3893, 3893], [3895, 3895], [3897, 3897], [3953, 3966], [3968, 3972], [3974, 3975], [3984, 3991], [3993, 4028], [4038, 4038], [4141, 4144], [4146, 4146], [4150, 4151], [4153, 4153], [4184, 4185], [4448, 4607], [4959, 4959], [5906, 5908], [5938, 5940], [5970, 5971], [6002, 6003], [6068, 6069], [6071, 6077], [6086, 6086], [6089, 6099], [6109, 6109], [6155, 6157], [6313, 6313], [6432, 6434], [6439, 6440], [6450, 6450], [6457, 6459], [6679, 6680], [6912, 6915], [6964, 6964], [6966, 6970], [6972, 6972], [6978, 6978], [7019, 7027], [7616, 7626], [7678, 7679], [8203, 8207], [8234, 8238], [8288, 8291], [8298, 8303], [8400, 8431], [12330, 12335], [12441, 12442], [43014, 43014], [43019, 43019], [43045, 43046], [64286, 64286], [65024, 65039], [65056, 65059], [65279, 65279], [65529, 65531]], n2 = [[68097, 68099], [68101, 68102], [68108, 68111], [68152, 68154], [68159, 68159], [119143, 119145], [119155, 119170], [119173, 119179], [119210, 119213], [119362, 119364], [917505, 917505], [917536, 917631], [917760, 917999]];
      let o;
      t3.UnicodeV6 = class {
        constructor() {
          if (this.version = "6", !o) {
            o = new Uint8Array(65536), o.fill(1), o[0] = 0, o.fill(0, 1, 32), o.fill(0, 127, 160), o.fill(2, 4352, 4448), o[9001] = 2, o[9002] = 2, o.fill(2, 11904, 42192), o[12351] = 1, o.fill(2, 44032, 55204), o.fill(2, 63744, 64256), o.fill(2, 65040, 65050), o.fill(2, 65072, 65136), o.fill(2, 65280, 65377), o.fill(2, 65504, 65511);
            for (let e3 = 0; e3 < r2.length; ++e3) o.fill(0, r2[e3][0], r2[e3][1] + 1);
          }
        }
        wcwidth(e3) {
          return e3 < 32 ? 0 : e3 < 127 ? 1 : e3 < 65536 ? o[e3] : function(e4, t4) {
            let i3, s3 = 0, r3 = t4.length - 1;
            if (e4 < t4[0][0] || e4 > t4[r3][1]) return false;
            for (; r3 >= s3; ) if (i3 = s3 + r3 >> 1, e4 > t4[i3][1]) s3 = i3 + 1;
            else {
              if (!(e4 < t4[i3][0])) return true;
              r3 = i3 - 1;
            }
            return false;
          }(e3, n2) ? 0 : e3 >= 131072 && e3 <= 196605 || e3 >= 196608 && e3 <= 262141 ? 2 : 1;
        }
        charProperties(e3, t4) {
          let i3 = this.wcwidth(e3), r3 = 0 === i3 && 0 !== t4;
          if (r3) {
            const e4 = s2.UnicodeService.extractWidth(t4);
            0 === e4 ? r3 = false : e4 > i3 && (i3 = e4);
          }
          return s2.UnicodeService.createPropertyValue(0, i3, r3);
        }
      };
    }, 5981: (e2, t3, i2) => {
      Object.defineProperty(t3, "__esModule", { value: true }), t3.WriteBuffer = void 0;
      const s2 = i2(8460), r2 = i2(844);
      class n2 extends r2.Disposable {
        constructor(e3) {
          super(), this._action = e3, this._writeBuffer = [], this._callbacks = [], this._pendingData = 0, this._bufferOffset = 0, this._isSyncWriting = false, this._syncCalls = 0, this._didUserInput = false, this._onWriteParsed = this.register(new s2.EventEmitter()), this.onWriteParsed = this._onWriteParsed.event;
        }
        handleUserInput() {
          this._didUserInput = true;
        }
        writeSync(e3, t4) {
          if (void 0 !== t4 && this._syncCalls > t4) return void (this._syncCalls = 0);
          if (this._pendingData += e3.length, this._writeBuffer.push(e3), this._callbacks.push(void 0), this._syncCalls++, this._isSyncWriting) return;
          let i3;
          for (this._isSyncWriting = true; i3 = this._writeBuffer.shift(); ) {
            this._action(i3);
            const e4 = this._callbacks.shift();
            e4 && e4();
          }
          this._pendingData = 0, this._bufferOffset = 2147483647, this._isSyncWriting = false, this._syncCalls = 0;
        }
        write(e3, t4) {
          if (this._pendingData > 5e7) throw new Error("write data discarded, use flow control to avoid losing data");
          if (!this._writeBuffer.length) {
            if (this._bufferOffset = 0, this._didUserInput) return this._didUserInput = false, this._pendingData += e3.length, this._writeBuffer.push(e3), this._callbacks.push(t4), void this._innerWrite();
            setTimeout(() => this._innerWrite());
          }
          this._pendingData += e3.length, this._writeBuffer.push(e3), this._callbacks.push(t4);
        }
        _innerWrite(e3 = 0, t4 = true) {
          const i3 = e3 || Date.now();
          for (; this._writeBuffer.length > this._bufferOffset; ) {
            const e4 = this._writeBuffer[this._bufferOffset], s3 = this._action(e4, t4);
            if (s3) {
              const e5 = (e6) => Date.now() - i3 >= 12 ? setTimeout(() => this._innerWrite(0, e6)) : this._innerWrite(i3, e6);
              return void s3.catch((e6) => (queueMicrotask(() => {
                throw e6;
              }), Promise.resolve(false))).then(e5);
            }
            const r3 = this._callbacks[this._bufferOffset];
            if (r3 && r3(), this._bufferOffset++, this._pendingData -= e4.length, Date.now() - i3 >= 12) break;
          }
          this._writeBuffer.length > this._bufferOffset ? (this._bufferOffset > 50 && (this._writeBuffer = this._writeBuffer.slice(this._bufferOffset), this._callbacks = this._callbacks.slice(this._bufferOffset), this._bufferOffset = 0), setTimeout(() => this._innerWrite())) : (this._writeBuffer.length = 0, this._callbacks.length = 0, this._pendingData = 0, this._bufferOffset = 0), this._onWriteParsed.fire();
        }
      }
      t3.WriteBuffer = n2;
    }, 5941: (e2, t3) => {
      Object.defineProperty(t3, "__esModule", { value: true }), t3.toRgbString = t3.parseColor = void 0;
      const i2 = /^([\da-f])\/([\da-f])\/([\da-f])$|^([\da-f]{2})\/([\da-f]{2})\/([\da-f]{2})$|^([\da-f]{3})\/([\da-f]{3})\/([\da-f]{3})$|^([\da-f]{4})\/([\da-f]{4})\/([\da-f]{4})$/, s2 = /^[\da-f]+$/;
      function r2(e3, t4) {
        const i3 = e3.toString(16), s3 = i3.length < 2 ? "0" + i3 : i3;
        switch (t4) {
          case 4:
            return i3[0];
          case 8:
            return s3;
          case 12:
            return (s3 + s3).slice(0, 3);
          default:
            return s3 + s3;
        }
      }
      t3.parseColor = function(e3) {
        if (!e3) return;
        let t4 = e3.toLowerCase();
        if (0 === t4.indexOf("rgb:")) {
          t4 = t4.slice(4);
          const e4 = i2.exec(t4);
          if (e4) {
            const t5 = e4[1] ? 15 : e4[4] ? 255 : e4[7] ? 4095 : 65535;
            return [Math.round(parseInt(e4[1] || e4[4] || e4[7] || e4[10], 16) / t5 * 255), Math.round(parseInt(e4[2] || e4[5] || e4[8] || e4[11], 16) / t5 * 255), Math.round(parseInt(e4[3] || e4[6] || e4[9] || e4[12], 16) / t5 * 255)];
          }
        } else if (0 === t4.indexOf("#") && (t4 = t4.slice(1), s2.exec(t4) && [3, 6, 9, 12].includes(t4.length))) {
          const e4 = t4.length / 3, i3 = [0, 0, 0];
          for (let s3 = 0; s3 < 3; ++s3) {
            const r3 = parseInt(t4.slice(e4 * s3, e4 * s3 + e4), 16);
            i3[s3] = 1 === e4 ? r3 << 4 : 2 === e4 ? r3 : 3 === e4 ? r3 >> 4 : r3 >> 8;
          }
          return i3;
        }
      }, t3.toRgbString = function(e3, t4 = 16) {
        const [i3, s3, n2] = e3;
        return `rgb:${r2(i3, t4)}/${r2(s3, t4)}/${r2(n2, t4)}`;
      };
    }, 5770: (e2, t3) => {
      Object.defineProperty(t3, "__esModule", { value: true }), t3.PAYLOAD_LIMIT = void 0, t3.PAYLOAD_LIMIT = 1e7;
    }, 6351: (e2, t3, i2) => {
      Object.defineProperty(t3, "__esModule", { value: true }), t3.DcsHandler = t3.DcsParser = void 0;
      const s2 = i2(482), r2 = i2(8742), n2 = i2(5770), o = [];
      t3.DcsParser = class {
        constructor() {
          this._handlers = /* @__PURE__ */ Object.create(null), this._active = o, this._ident = 0, this._handlerFb = () => {
          }, this._stack = { paused: false, loopPosition: 0, fallThrough: false };
        }
        dispose() {
          this._handlers = /* @__PURE__ */ Object.create(null), this._handlerFb = () => {
          }, this._active = o;
        }
        registerHandler(e3, t4) {
          void 0 === this._handlers[e3] && (this._handlers[e3] = []);
          const i3 = this._handlers[e3];
          return i3.push(t4), { dispose: () => {
            const e4 = i3.indexOf(t4);
            -1 !== e4 && i3.splice(e4, 1);
          } };
        }
        clearHandler(e3) {
          this._handlers[e3] && delete this._handlers[e3];
        }
        setHandlerFallback(e3) {
          this._handlerFb = e3;
        }
        reset() {
          if (this._active.length) for (let e3 = this._stack.paused ? this._stack.loopPosition - 1 : this._active.length - 1; e3 >= 0; --e3) this._active[e3].unhook(false);
          this._stack.paused = false, this._active = o, this._ident = 0;
        }
        hook(e3, t4) {
          if (this.reset(), this._ident = e3, this._active = this._handlers[e3] || o, this._active.length) for (let e4 = this._active.length - 1; e4 >= 0; e4--) this._active[e4].hook(t4);
          else this._handlerFb(this._ident, "HOOK", t4);
        }
        put(e3, t4, i3) {
          if (this._active.length) for (let s3 = this._active.length - 1; s3 >= 0; s3--) this._active[s3].put(e3, t4, i3);
          else this._handlerFb(this._ident, "PUT", (0, s2.utf32ToString)(e3, t4, i3));
        }
        unhook(e3, t4 = true) {
          if (this._active.length) {
            let i3 = false, s3 = this._active.length - 1, r3 = false;
            if (this._stack.paused && (s3 = this._stack.loopPosition - 1, i3 = t4, r3 = this._stack.fallThrough, this._stack.paused = false), !r3 && false === i3) {
              for (; s3 >= 0 && (i3 = this._active[s3].unhook(e3), true !== i3); s3--) if (i3 instanceof Promise) return this._stack.paused = true, this._stack.loopPosition = s3, this._stack.fallThrough = false, i3;
              s3--;
            }
            for (; s3 >= 0; s3--) if (i3 = this._active[s3].unhook(false), i3 instanceof Promise) return this._stack.paused = true, this._stack.loopPosition = s3, this._stack.fallThrough = true, i3;
          } else this._handlerFb(this._ident, "UNHOOK", e3);
          this._active = o, this._ident = 0;
        }
      };
      const a = new r2.Params();
      a.addParam(0), t3.DcsHandler = class {
        constructor(e3) {
          this._handler = e3, this._data = "", this._params = a, this._hitLimit = false;
        }
        hook(e3) {
          this._params = e3.length > 1 || e3.params[0] ? e3.clone() : a, this._data = "", this._hitLimit = false;
        }
        put(e3, t4, i3) {
          this._hitLimit || (this._data += (0, s2.utf32ToString)(e3, t4, i3), this._data.length > n2.PAYLOAD_LIMIT && (this._data = "", this._hitLimit = true));
        }
        unhook(e3) {
          let t4 = false;
          if (this._hitLimit) t4 = false;
          else if (e3 && (t4 = this._handler(this._data, this._params), t4 instanceof Promise)) return t4.then((e4) => (this._params = a, this._data = "", this._hitLimit = false, e4));
          return this._params = a, this._data = "", this._hitLimit = false, t4;
        }
      };
    }, 2015: (e2, t3, i2) => {
      Object.defineProperty(t3, "__esModule", { value: true }), t3.EscapeSequenceParser = t3.VT500_TRANSITION_TABLE = t3.TransitionTable = void 0;
      const s2 = i2(844), r2 = i2(8742), n2 = i2(6242), o = i2(6351);
      class a {
        constructor(e3) {
          this.table = new Uint8Array(e3);
        }
        setDefault(e3, t4) {
          this.table.fill(e3 << 4 | t4);
        }
        add(e3, t4, i3, s3) {
          this.table[t4 << 8 | e3] = i3 << 4 | s3;
        }
        addMany(e3, t4, i3, s3) {
          for (let r3 = 0; r3 < e3.length; r3++) this.table[t4 << 8 | e3[r3]] = i3 << 4 | s3;
        }
      }
      t3.TransitionTable = a;
      const h = 160;
      t3.VT500_TRANSITION_TABLE = function() {
        const e3 = new a(4095), t4 = Array.apply(null, Array(256)).map((e4, t5) => t5), i3 = (e4, i4) => t4.slice(e4, i4), s3 = i3(32, 127), r3 = i3(0, 24);
        r3.push(25), r3.push.apply(r3, i3(28, 32));
        const n3 = i3(0, 14);
        let o2;
        for (o2 in e3.setDefault(1, 0), e3.addMany(s3, 0, 2, 0), n3) e3.addMany([24, 26, 153, 154], o2, 3, 0), e3.addMany(i3(128, 144), o2, 3, 0), e3.addMany(i3(144, 152), o2, 3, 0), e3.add(156, o2, 0, 0), e3.add(27, o2, 11, 1), e3.add(157, o2, 4, 8), e3.addMany([152, 158, 159], o2, 0, 7), e3.add(155, o2, 11, 3), e3.add(144, o2, 11, 9);
        return e3.addMany(r3, 0, 3, 0), e3.addMany(r3, 1, 3, 1), e3.add(127, 1, 0, 1), e3.addMany(r3, 8, 0, 8), e3.addMany(r3, 3, 3, 3), e3.add(127, 3, 0, 3), e3.addMany(r3, 4, 3, 4), e3.add(127, 4, 0, 4), e3.addMany(r3, 6, 3, 6), e3.addMany(r3, 5, 3, 5), e3.add(127, 5, 0, 5), e3.addMany(r3, 2, 3, 2), e3.add(127, 2, 0, 2), e3.add(93, 1, 4, 8), e3.addMany(s3, 8, 5, 8), e3.add(127, 8, 5, 8), e3.addMany([156, 27, 24, 26, 7], 8, 6, 0), e3.addMany(i3(28, 32), 8, 0, 8), e3.addMany([88, 94, 95], 1, 0, 7), e3.addMany(s3, 7, 0, 7), e3.addMany(r3, 7, 0, 7), e3.add(156, 7, 0, 0), e3.add(127, 7, 0, 7), e3.add(91, 1, 11, 3), e3.addMany(i3(64, 127), 3, 7, 0), e3.addMany(i3(48, 60), 3, 8, 4), e3.addMany([60, 61, 62, 63], 3, 9, 4), e3.addMany(i3(48, 60), 4, 8, 4), e3.addMany(i3(64, 127), 4, 7, 0), e3.addMany([60, 61, 62, 63], 4, 0, 6), e3.addMany(i3(32, 64), 6, 0, 6), e3.add(127, 6, 0, 6), e3.addMany(i3(64, 127), 6, 0, 0), e3.addMany(i3(32, 48), 3, 9, 5), e3.addMany(i3(32, 48), 5, 9, 5), e3.addMany(i3(48, 64), 5, 0, 6), e3.addMany(i3(64, 127), 5, 7, 0), e3.addMany(i3(32, 48), 4, 9, 5), e3.addMany(i3(32, 48), 1, 9, 2), e3.addMany(i3(32, 48), 2, 9, 2), e3.addMany(i3(48, 127), 2, 10, 0), e3.addMany(i3(48, 80), 1, 10, 0), e3.addMany(i3(81, 88), 1, 10, 0), e3.addMany([89, 90, 92], 1, 10, 0), e3.addMany(i3(96, 127), 1, 10, 0), e3.add(80, 1, 11, 9), e3.addMany(r3, 9, 0, 9), e3.add(127, 9, 0, 9), e3.addMany(i3(28, 32), 9, 0, 9), e3.addMany(i3(32, 48), 9, 9, 12), e3.addMany(i3(48, 60), 9, 8, 10), e3.addMany([60, 61, 62, 63], 9, 9, 10), e3.addMany(r3, 11, 0, 11), e3.addMany(i3(32, 128), 11, 0, 11), e3.addMany(i3(28, 32), 11, 0, 11), e3.addMany(r3, 10, 0, 10), e3.add(127, 10, 0, 10), e3.addMany(i3(28, 32), 10, 0, 10), e3.addMany(i3(48, 60), 10, 8, 10), e3.addMany([60, 61, 62, 63], 10, 0, 11), e3.addMany(i3(32, 48), 10, 9, 12), e3.addMany(r3, 12, 0, 12), e3.add(127, 12, 0, 12), e3.addMany(i3(28, 32), 12, 0, 12), e3.addMany(i3(32, 48), 12, 9, 12), e3.addMany(i3(48, 64), 12, 0, 11), e3.addMany(i3(64, 127), 12, 12, 13), e3.addMany(i3(64, 127), 10, 12, 13), e3.addMany(i3(64, 127), 9, 12, 13), e3.addMany(r3, 13, 13, 13), e3.addMany(s3, 13, 13, 13), e3.add(127, 13, 0, 13), e3.addMany([27, 156, 24, 26], 13, 14, 0), e3.add(h, 0, 2, 0), e3.add(h, 8, 5, 8), e3.add(h, 6, 0, 6), e3.add(h, 11, 0, 11), e3.add(h, 13, 13, 13), e3;
      }();
      class c extends s2.Disposable {
        constructor(e3 = t3.VT500_TRANSITION_TABLE) {
          super(), this._transitions = e3, this._parseStack = { state: 0, handlers: [], handlerPos: 0, transition: 0, chunkPos: 0 }, this.initialState = 0, this.currentState = this.initialState, this._params = new r2.Params(), this._params.addParam(0), this._collect = 0, this.precedingJoinState = 0, this._printHandlerFb = (e4, t4, i3) => {
          }, this._executeHandlerFb = (e4) => {
          }, this._csiHandlerFb = (e4, t4) => {
          }, this._escHandlerFb = (e4) => {
          }, this._errorHandlerFb = (e4) => e4, this._printHandler = this._printHandlerFb, this._executeHandlers = /* @__PURE__ */ Object.create(null), this._csiHandlers = /* @__PURE__ */ Object.create(null), this._escHandlers = /* @__PURE__ */ Object.create(null), this.register((0, s2.toDisposable)(() => {
            this._csiHandlers = /* @__PURE__ */ Object.create(null), this._executeHandlers = /* @__PURE__ */ Object.create(null), this._escHandlers = /* @__PURE__ */ Object.create(null);
          })), this._oscParser = this.register(new n2.OscParser()), this._dcsParser = this.register(new o.DcsParser()), this._errorHandler = this._errorHandlerFb, this.registerEscHandler({ final: "\\" }, () => true);
        }
        _identifier(e3, t4 = [64, 126]) {
          let i3 = 0;
          if (e3.prefix) {
            if (e3.prefix.length > 1) throw new Error("only one byte as prefix supported");
            if (i3 = e3.prefix.charCodeAt(0), i3 && 60 > i3 || i3 > 63) throw new Error("prefix must be in range 0x3c .. 0x3f");
          }
          if (e3.intermediates) {
            if (e3.intermediates.length > 2) throw new Error("only two bytes as intermediates are supported");
            for (let t5 = 0; t5 < e3.intermediates.length; ++t5) {
              const s4 = e3.intermediates.charCodeAt(t5);
              if (32 > s4 || s4 > 47) throw new Error("intermediate must be in range 0x20 .. 0x2f");
              i3 <<= 8, i3 |= s4;
            }
          }
          if (1 !== e3.final.length) throw new Error("final must be a single byte");
          const s3 = e3.final.charCodeAt(0);
          if (t4[0] > s3 || s3 > t4[1]) throw new Error(`final must be in range ${t4[0]} .. ${t4[1]}`);
          return i3 <<= 8, i3 |= s3, i3;
        }
        identToString(e3) {
          const t4 = [];
          for (; e3; ) t4.push(String.fromCharCode(255 & e3)), e3 >>= 8;
          return t4.reverse().join("");
        }
        setPrintHandler(e3) {
          this._printHandler = e3;
        }
        clearPrintHandler() {
          this._printHandler = this._printHandlerFb;
        }
        registerEscHandler(e3, t4) {
          const i3 = this._identifier(e3, [48, 126]);
          void 0 === this._escHandlers[i3] && (this._escHandlers[i3] = []);
          const s3 = this._escHandlers[i3];
          return s3.push(t4), { dispose: () => {
            const e4 = s3.indexOf(t4);
            -1 !== e4 && s3.splice(e4, 1);
          } };
        }
        clearEscHandler(e3) {
          this._escHandlers[this._identifier(e3, [48, 126])] && delete this._escHandlers[this._identifier(e3, [48, 126])];
        }
        setEscHandlerFallback(e3) {
          this._escHandlerFb = e3;
        }
        setExecuteHandler(e3, t4) {
          this._executeHandlers[e3.charCodeAt(0)] = t4;
        }
        clearExecuteHandler(e3) {
          this._executeHandlers[e3.charCodeAt(0)] && delete this._executeHandlers[e3.charCodeAt(0)];
        }
        setExecuteHandlerFallback(e3) {
          this._executeHandlerFb = e3;
        }
        registerCsiHandler(e3, t4) {
          const i3 = this._identifier(e3);
          void 0 === this._csiHandlers[i3] && (this._csiHandlers[i3] = []);
          const s3 = this._csiHandlers[i3];
          return s3.push(t4), { dispose: () => {
            const e4 = s3.indexOf(t4);
            -1 !== e4 && s3.splice(e4, 1);
          } };
        }
        clearCsiHandler(e3) {
          this._csiHandlers[this._identifier(e3)] && delete this._csiHandlers[this._identifier(e3)];
        }
        setCsiHandlerFallback(e3) {
          this._csiHandlerFb = e3;
        }
        registerDcsHandler(e3, t4) {
          return this._dcsParser.registerHandler(this._identifier(e3), t4);
        }
        clearDcsHandler(e3) {
          this._dcsParser.clearHandler(this._identifier(e3));
        }
        setDcsHandlerFallback(e3) {
          this._dcsParser.setHandlerFallback(e3);
        }
        registerOscHandler(e3, t4) {
          return this._oscParser.registerHandler(e3, t4);
        }
        clearOscHandler(e3) {
          this._oscParser.clearHandler(e3);
        }
        setOscHandlerFallback(e3) {
          this._oscParser.setHandlerFallback(e3);
        }
        setErrorHandler(e3) {
          this._errorHandler = e3;
        }
        clearErrorHandler() {
          this._errorHandler = this._errorHandlerFb;
        }
        reset() {
          this.currentState = this.initialState, this._oscParser.reset(), this._dcsParser.reset(), this._params.reset(), this._params.addParam(0), this._collect = 0, this.precedingJoinState = 0, 0 !== this._parseStack.state && (this._parseStack.state = 2, this._parseStack.handlers = []);
        }
        _preserveStack(e3, t4, i3, s3, r3) {
          this._parseStack.state = e3, this._parseStack.handlers = t4, this._parseStack.handlerPos = i3, this._parseStack.transition = s3, this._parseStack.chunkPos = r3;
        }
        parse(e3, t4, i3) {
          let s3, r3 = 0, n3 = 0, o2 = 0;
          if (this._parseStack.state) if (2 === this._parseStack.state) this._parseStack.state = 0, o2 = this._parseStack.chunkPos + 1;
          else {
            if (void 0 === i3 || 1 === this._parseStack.state) throw this._parseStack.state = 1, new Error("improper continuation due to previous async handler, giving up parsing");
            const t5 = this._parseStack.handlers;
            let n4 = this._parseStack.handlerPos - 1;
            switch (this._parseStack.state) {
              case 3:
                if (false === i3 && n4 > -1) {
                  for (; n4 >= 0 && (s3 = t5[n4](this._params), true !== s3); n4--) if (s3 instanceof Promise) return this._parseStack.handlerPos = n4, s3;
                }
                this._parseStack.handlers = [];
                break;
              case 4:
                if (false === i3 && n4 > -1) {
                  for (; n4 >= 0 && (s3 = t5[n4](), true !== s3); n4--) if (s3 instanceof Promise) return this._parseStack.handlerPos = n4, s3;
                }
                this._parseStack.handlers = [];
                break;
              case 6:
                if (r3 = e3[this._parseStack.chunkPos], s3 = this._dcsParser.unhook(24 !== r3 && 26 !== r3, i3), s3) return s3;
                27 === r3 && (this._parseStack.transition |= 1), this._params.reset(), this._params.addParam(0), this._collect = 0;
                break;
              case 5:
                if (r3 = e3[this._parseStack.chunkPos], s3 = this._oscParser.end(24 !== r3 && 26 !== r3, i3), s3) return s3;
                27 === r3 && (this._parseStack.transition |= 1), this._params.reset(), this._params.addParam(0), this._collect = 0;
            }
            this._parseStack.state = 0, o2 = this._parseStack.chunkPos + 1, this.precedingJoinState = 0, this.currentState = 15 & this._parseStack.transition;
          }
          for (let i4 = o2; i4 < t4; ++i4) {
            switch (r3 = e3[i4], n3 = this._transitions.table[this.currentState << 8 | (r3 < 160 ? r3 : h)], n3 >> 4) {
              case 2:
                for (let s4 = i4 + 1; ; ++s4) {
                  if (s4 >= t4 || (r3 = e3[s4]) < 32 || r3 > 126 && r3 < h) {
                    this._printHandler(e3, i4, s4), i4 = s4 - 1;
                    break;
                  }
                  if (++s4 >= t4 || (r3 = e3[s4]) < 32 || r3 > 126 && r3 < h) {
                    this._printHandler(e3, i4, s4), i4 = s4 - 1;
                    break;
                  }
                  if (++s4 >= t4 || (r3 = e3[s4]) < 32 || r3 > 126 && r3 < h) {
                    this._printHandler(e3, i4, s4), i4 = s4 - 1;
                    break;
                  }
                  if (++s4 >= t4 || (r3 = e3[s4]) < 32 || r3 > 126 && r3 < h) {
                    this._printHandler(e3, i4, s4), i4 = s4 - 1;
                    break;
                  }
                }
                break;
              case 3:
                this._executeHandlers[r3] ? this._executeHandlers[r3]() : this._executeHandlerFb(r3), this.precedingJoinState = 0;
                break;
              case 0:
                break;
              case 1:
                if (this._errorHandler({ position: i4, code: r3, currentState: this.currentState, collect: this._collect, params: this._params, abort: false }).abort) return;
                break;
              case 7:
                const o3 = this._csiHandlers[this._collect << 8 | r3];
                let a2 = o3 ? o3.length - 1 : -1;
                for (; a2 >= 0 && (s3 = o3[a2](this._params), true !== s3); a2--) if (s3 instanceof Promise) return this._preserveStack(3, o3, a2, n3, i4), s3;
                a2 < 0 && this._csiHandlerFb(this._collect << 8 | r3, this._params), this.precedingJoinState = 0;
                break;
              case 8:
                do {
                  switch (r3) {
                    case 59:
                      this._params.addParam(0);
                      break;
                    case 58:
                      this._params.addSubParam(-1);
                      break;
                    default:
                      this._params.addDigit(r3 - 48);
                  }
                } while (++i4 < t4 && (r3 = e3[i4]) > 47 && r3 < 60);
                i4--;
                break;
              case 9:
                this._collect <<= 8, this._collect |= r3;
                break;
              case 10:
                const c2 = this._escHandlers[this._collect << 8 | r3];
                let l2 = c2 ? c2.length - 1 : -1;
                for (; l2 >= 0 && (s3 = c2[l2](), true !== s3); l2--) if (s3 instanceof Promise) return this._preserveStack(4, c2, l2, n3, i4), s3;
                l2 < 0 && this._escHandlerFb(this._collect << 8 | r3), this.precedingJoinState = 0;
                break;
              case 11:
                this._params.reset(), this._params.addParam(0), this._collect = 0;
                break;
              case 12:
                this._dcsParser.hook(this._collect << 8 | r3, this._params);
                break;
              case 13:
                for (let s4 = i4 + 1; ; ++s4) if (s4 >= t4 || 24 === (r3 = e3[s4]) || 26 === r3 || 27 === r3 || r3 > 127 && r3 < h) {
                  this._dcsParser.put(e3, i4, s4), i4 = s4 - 1;
                  break;
                }
                break;
              case 14:
                if (s3 = this._dcsParser.unhook(24 !== r3 && 26 !== r3), s3) return this._preserveStack(6, [], 0, n3, i4), s3;
                27 === r3 && (n3 |= 1), this._params.reset(), this._params.addParam(0), this._collect = 0, this.precedingJoinState = 0;
                break;
              case 4:
                this._oscParser.start();
                break;
              case 5:
                for (let s4 = i4 + 1; ; s4++) if (s4 >= t4 || (r3 = e3[s4]) < 32 || r3 > 127 && r3 < h) {
                  this._oscParser.put(e3, i4, s4), i4 = s4 - 1;
                  break;
                }
                break;
              case 6:
                if (s3 = this._oscParser.end(24 !== r3 && 26 !== r3), s3) return this._preserveStack(5, [], 0, n3, i4), s3;
                27 === r3 && (n3 |= 1), this._params.reset(), this._params.addParam(0), this._collect = 0, this.precedingJoinState = 0;
            }
            this.currentState = 15 & n3;
          }
        }
      }
      t3.EscapeSequenceParser = c;
    }, 6242: (e2, t3, i2) => {
      Object.defineProperty(t3, "__esModule", { value: true }), t3.OscHandler = t3.OscParser = void 0;
      const s2 = i2(5770), r2 = i2(482), n2 = [];
      t3.OscParser = class {
        constructor() {
          this._state = 0, this._active = n2, this._id = -1, this._handlers = /* @__PURE__ */ Object.create(null), this._handlerFb = () => {
          }, this._stack = { paused: false, loopPosition: 0, fallThrough: false };
        }
        registerHandler(e3, t4) {
          void 0 === this._handlers[e3] && (this._handlers[e3] = []);
          const i3 = this._handlers[e3];
          return i3.push(t4), { dispose: () => {
            const e4 = i3.indexOf(t4);
            -1 !== e4 && i3.splice(e4, 1);
          } };
        }
        clearHandler(e3) {
          this._handlers[e3] && delete this._handlers[e3];
        }
        setHandlerFallback(e3) {
          this._handlerFb = e3;
        }
        dispose() {
          this._handlers = /* @__PURE__ */ Object.create(null), this._handlerFb = () => {
          }, this._active = n2;
        }
        reset() {
          if (2 === this._state) for (let e3 = this._stack.paused ? this._stack.loopPosition - 1 : this._active.length - 1; e3 >= 0; --e3) this._active[e3].end(false);
          this._stack.paused = false, this._active = n2, this._id = -1, this._state = 0;
        }
        _start() {
          if (this._active = this._handlers[this._id] || n2, this._active.length) for (let e3 = this._active.length - 1; e3 >= 0; e3--) this._active[e3].start();
          else this._handlerFb(this._id, "START");
        }
        _put(e3, t4, i3) {
          if (this._active.length) for (let s3 = this._active.length - 1; s3 >= 0; s3--) this._active[s3].put(e3, t4, i3);
          else this._handlerFb(this._id, "PUT", (0, r2.utf32ToString)(e3, t4, i3));
        }
        start() {
          this.reset(), this._state = 1;
        }
        put(e3, t4, i3) {
          if (3 !== this._state) {
            if (1 === this._state) for (; t4 < i3; ) {
              const i4 = e3[t4++];
              if (59 === i4) {
                this._state = 2, this._start();
                break;
              }
              if (i4 < 48 || 57 < i4) return void (this._state = 3);
              -1 === this._id && (this._id = 0), this._id = 10 * this._id + i4 - 48;
            }
            2 === this._state && i3 - t4 > 0 && this._put(e3, t4, i3);
          }
        }
        end(e3, t4 = true) {
          if (0 !== this._state) {
            if (3 !== this._state) if (1 === this._state && this._start(), this._active.length) {
              let i3 = false, s3 = this._active.length - 1, r3 = false;
              if (this._stack.paused && (s3 = this._stack.loopPosition - 1, i3 = t4, r3 = this._stack.fallThrough, this._stack.paused = false), !r3 && false === i3) {
                for (; s3 >= 0 && (i3 = this._active[s3].end(e3), true !== i3); s3--) if (i3 instanceof Promise) return this._stack.paused = true, this._stack.loopPosition = s3, this._stack.fallThrough = false, i3;
                s3--;
              }
              for (; s3 >= 0; s3--) if (i3 = this._active[s3].end(false), i3 instanceof Promise) return this._stack.paused = true, this._stack.loopPosition = s3, this._stack.fallThrough = true, i3;
            } else this._handlerFb(this._id, "END", e3);
            this._active = n2, this._id = -1, this._state = 0;
          }
        }
      }, t3.OscHandler = class {
        constructor(e3) {
          this._handler = e3, this._data = "", this._hitLimit = false;
        }
        start() {
          this._data = "", this._hitLimit = false;
        }
        put(e3, t4, i3) {
          this._hitLimit || (this._data += (0, r2.utf32ToString)(e3, t4, i3), this._data.length > s2.PAYLOAD_LIMIT && (this._data = "", this._hitLimit = true));
        }
        end(e3) {
          let t4 = false;
          if (this._hitLimit) t4 = false;
          else if (e3 && (t4 = this._handler(this._data), t4 instanceof Promise)) return t4.then((e4) => (this._data = "", this._hitLimit = false, e4));
          return this._data = "", this._hitLimit = false, t4;
        }
      };
    }, 8742: (e2, t3) => {
      Object.defineProperty(t3, "__esModule", { value: true }), t3.Params = void 0;
      const i2 = 2147483647;
      class s2 {
        static fromArray(e3) {
          const t4 = new s2();
          if (!e3.length) return t4;
          for (let i3 = Array.isArray(e3[0]) ? 1 : 0; i3 < e3.length; ++i3) {
            const s3 = e3[i3];
            if (Array.isArray(s3)) for (let e4 = 0; e4 < s3.length; ++e4) t4.addSubParam(s3[e4]);
            else t4.addParam(s3);
          }
          return t4;
        }
        constructor(e3 = 32, t4 = 32) {
          if (this.maxLength = e3, this.maxSubParamsLength = t4, t4 > 256) throw new Error("maxSubParamsLength must not be greater than 256");
          this.params = new Int32Array(e3), this.length = 0, this._subParams = new Int32Array(t4), this._subParamsLength = 0, this._subParamsIdx = new Uint16Array(e3), this._rejectDigits = false, this._rejectSubDigits = false, this._digitIsSub = false;
        }
        clone() {
          const e3 = new s2(this.maxLength, this.maxSubParamsLength);
          return e3.params.set(this.params), e3.length = this.length, e3._subParams.set(this._subParams), e3._subParamsLength = this._subParamsLength, e3._subParamsIdx.set(this._subParamsIdx), e3._rejectDigits = this._rejectDigits, e3._rejectSubDigits = this._rejectSubDigits, e3._digitIsSub = this._digitIsSub, e3;
        }
        toArray() {
          const e3 = [];
          for (let t4 = 0; t4 < this.length; ++t4) {
            e3.push(this.params[t4]);
            const i3 = this._subParamsIdx[t4] >> 8, s3 = 255 & this._subParamsIdx[t4];
            s3 - i3 > 0 && e3.push(Array.prototype.slice.call(this._subParams, i3, s3));
          }
          return e3;
        }
        reset() {
          this.length = 0, this._subParamsLength = 0, this._rejectDigits = false, this._rejectSubDigits = false, this._digitIsSub = false;
        }
        addParam(e3) {
          if (this._digitIsSub = false, this.length >= this.maxLength) this._rejectDigits = true;
          else {
            if (e3 < -1) throw new Error("values lesser than -1 are not allowed");
            this._subParamsIdx[this.length] = this._subParamsLength << 8 | this._subParamsLength, this.params[this.length++] = e3 > i2 ? i2 : e3;
          }
        }
        addSubParam(e3) {
          if (this._digitIsSub = true, this.length) if (this._rejectDigits || this._subParamsLength >= this.maxSubParamsLength) this._rejectSubDigits = true;
          else {
            if (e3 < -1) throw new Error("values lesser than -1 are not allowed");
            this._subParams[this._subParamsLength++] = e3 > i2 ? i2 : e3, this._subParamsIdx[this.length - 1]++;
          }
        }
        hasSubParams(e3) {
          return (255 & this._subParamsIdx[e3]) - (this._subParamsIdx[e3] >> 8) > 0;
        }
        getSubParams(e3) {
          const t4 = this._subParamsIdx[e3] >> 8, i3 = 255 & this._subParamsIdx[e3];
          return i3 - t4 > 0 ? this._subParams.subarray(t4, i3) : null;
        }
        getSubParamsAll() {
          const e3 = {};
          for (let t4 = 0; t4 < this.length; ++t4) {
            const i3 = this._subParamsIdx[t4] >> 8, s3 = 255 & this._subParamsIdx[t4];
            s3 - i3 > 0 && (e3[t4] = this._subParams.slice(i3, s3));
          }
          return e3;
        }
        addDigit(e3) {
          let t4;
          if (this._rejectDigits || !(t4 = this._digitIsSub ? this._subParamsLength : this.length) || this._digitIsSub && this._rejectSubDigits) return;
          const s3 = this._digitIsSub ? this._subParams : this.params, r2 = s3[t4 - 1];
          s3[t4 - 1] = ~r2 ? Math.min(10 * r2 + e3, i2) : e3;
        }
      }
      t3.Params = s2;
    }, 5741: (e2, t3) => {
      Object.defineProperty(t3, "__esModule", { value: true }), t3.AddonManager = void 0, t3.AddonManager = class {
        constructor() {
          this._addons = [];
        }
        dispose() {
          for (let e3 = this._addons.length - 1; e3 >= 0; e3--) this._addons[e3].instance.dispose();
        }
        loadAddon(e3, t4) {
          const i2 = { instance: t4, dispose: t4.dispose, isDisposed: false };
          this._addons.push(i2), t4.dispose = () => this._wrappedAddonDispose(i2), t4.activate(e3);
        }
        _wrappedAddonDispose(e3) {
          if (e3.isDisposed) return;
          let t4 = -1;
          for (let i2 = 0; i2 < this._addons.length; i2++) if (this._addons[i2] === e3) {
            t4 = i2;
            break;
          }
          if (-1 === t4) throw new Error("Could not dispose an addon that has not been loaded");
          e3.isDisposed = true, e3.dispose.apply(e3.instance), this._addons.splice(t4, 1);
        }
      };
    }, 8771: (e2, t3, i2) => {
      Object.defineProperty(t3, "__esModule", { value: true }), t3.BufferApiView = void 0;
      const s2 = i2(3785), r2 = i2(511);
      t3.BufferApiView = class {
        constructor(e3, t4) {
          this._buffer = e3, this.type = t4;
        }
        init(e3) {
          return this._buffer = e3, this;
        }
        get cursorY() {
          return this._buffer.y;
        }
        get cursorX() {
          return this._buffer.x;
        }
        get viewportY() {
          return this._buffer.ydisp;
        }
        get baseY() {
          return this._buffer.ybase;
        }
        get length() {
          return this._buffer.lines.length;
        }
        getLine(e3) {
          const t4 = this._buffer.lines.get(e3);
          if (t4) return new s2.BufferLineApiView(t4);
        }
        getNullCell() {
          return new r2.CellData();
        }
      };
    }, 3785: (e2, t3, i2) => {
      Object.defineProperty(t3, "__esModule", { value: true }), t3.BufferLineApiView = void 0;
      const s2 = i2(511);
      t3.BufferLineApiView = class {
        constructor(e3) {
          this._line = e3;
        }
        get isWrapped() {
          return this._line.isWrapped;
        }
        get length() {
          return this._line.length;
        }
        getCell(e3, t4) {
          if (!(e3 < 0 || e3 >= this._line.length)) return t4 ? (this._line.loadCell(e3, t4), t4) : this._line.loadCell(e3, new s2.CellData());
        }
        translateToString(e3, t4, i3) {
          return this._line.translateToString(e3, t4, i3);
        }
      };
    }, 8285: (e2, t3, i2) => {
      Object.defineProperty(t3, "__esModule", { value: true }), t3.BufferNamespaceApi = void 0;
      const s2 = i2(8771), r2 = i2(8460), n2 = i2(844);
      class o extends n2.Disposable {
        constructor(e3) {
          super(), this._core = e3, this._onBufferChange = this.register(new r2.EventEmitter()), this.onBufferChange = this._onBufferChange.event, this._normal = new s2.BufferApiView(this._core.buffers.normal, "normal"), this._alternate = new s2.BufferApiView(this._core.buffers.alt, "alternate"), this._core.buffers.onBufferActivate(() => this._onBufferChange.fire(this.active));
        }
        get active() {
          if (this._core.buffers.active === this._core.buffers.normal) return this.normal;
          if (this._core.buffers.active === this._core.buffers.alt) return this.alternate;
          throw new Error("Active buffer is neither normal nor alternate");
        }
        get normal() {
          return this._normal.init(this._core.buffers.normal);
        }
        get alternate() {
          return this._alternate.init(this._core.buffers.alt);
        }
      }
      t3.BufferNamespaceApi = o;
    }, 7975: (e2, t3) => {
      Object.defineProperty(t3, "__esModule", { value: true }), t3.ParserApi = void 0, t3.ParserApi = class {
        constructor(e3) {
          this._core = e3;
        }
        registerCsiHandler(e3, t4) {
          return this._core.registerCsiHandler(e3, (e4) => t4(e4.toArray()));
        }
        addCsiHandler(e3, t4) {
          return this.registerCsiHandler(e3, t4);
        }
        registerDcsHandler(e3, t4) {
          return this._core.registerDcsHandler(e3, (e4, i2) => t4(e4, i2.toArray()));
        }
        addDcsHandler(e3, t4) {
          return this.registerDcsHandler(e3, t4);
        }
        registerEscHandler(e3, t4) {
          return this._core.registerEscHandler(e3, t4);
        }
        addEscHandler(e3, t4) {
          return this.registerEscHandler(e3, t4);
        }
        registerOscHandler(e3, t4) {
          return this._core.registerOscHandler(e3, t4);
        }
        addOscHandler(e3, t4) {
          return this.registerOscHandler(e3, t4);
        }
      };
    }, 7090: (e2, t3) => {
      Object.defineProperty(t3, "__esModule", { value: true }), t3.UnicodeApi = void 0, t3.UnicodeApi = class {
        constructor(e3) {
          this._core = e3;
        }
        register(e3) {
          this._core.unicodeService.register(e3);
        }
        get versions() {
          return this._core.unicodeService.versions;
        }
        get activeVersion() {
          return this._core.unicodeService.activeVersion;
        }
        set activeVersion(e3) {
          this._core.unicodeService.activeVersion = e3;
        }
      };
    }, 744: function(e2, t3, i2) {
      var s2 = this && this.__decorate || function(e3, t4, i3, s3) {
        var r3, n3 = arguments.length, o2 = n3 < 3 ? t4 : null === s3 ? s3 = Object.getOwnPropertyDescriptor(t4, i3) : s3;
        if ("object" == typeof Reflect && "function" == typeof Reflect.decorate) o2 = Reflect.decorate(e3, t4, i3, s3);
        else for (var a2 = e3.length - 1; a2 >= 0; a2--) (r3 = e3[a2]) && (o2 = (n3 < 3 ? r3(o2) : n3 > 3 ? r3(t4, i3, o2) : r3(t4, i3)) || o2);
        return n3 > 3 && o2 && Object.defineProperty(t4, i3, o2), o2;
      }, r2 = this && this.__param || function(e3, t4) {
        return function(i3, s3) {
          t4(i3, s3, e3);
        };
      };
      Object.defineProperty(t3, "__esModule", { value: true }), t3.BufferService = t3.MINIMUM_ROWS = t3.MINIMUM_COLS = void 0;
      const n2 = i2(8460), o = i2(844), a = i2(5295), h = i2(2585);
      t3.MINIMUM_COLS = 2, t3.MINIMUM_ROWS = 1;
      let c = t3.BufferService = class extends o.Disposable {
        get buffer() {
          return this.buffers.active;
        }
        constructor(e3) {
          super(), this.isUserScrolling = false, this._onResize = this.register(new n2.EventEmitter()), this.onResize = this._onResize.event, this._onScroll = this.register(new n2.EventEmitter()), this.onScroll = this._onScroll.event, this.cols = Math.max(e3.rawOptions.cols || 0, t3.MINIMUM_COLS), this.rows = Math.max(e3.rawOptions.rows || 0, t3.MINIMUM_ROWS), this.buffers = this.register(new a.BufferSet(e3, this));
        }
        resize(e3, t4) {
          this.cols = e3, this.rows = t4, this.buffers.resize(e3, t4), this._onResize.fire({ cols: e3, rows: t4 });
        }
        reset() {
          this.buffers.reset(), this.isUserScrolling = false;
        }
        scroll(e3, t4 = false) {
          const i3 = this.buffer;
          let s3;
          s3 = this._cachedBlankLine, s3 && s3.length === this.cols && s3.getFg(0) === e3.fg && s3.getBg(0) === e3.bg || (s3 = i3.getBlankLine(e3, t4), this._cachedBlankLine = s3), s3.isWrapped = t4;
          const r3 = i3.ybase + i3.scrollTop, n3 = i3.ybase + i3.scrollBottom;
          if (0 === i3.scrollTop) {
            const e4 = i3.lines.isFull;
            n3 === i3.lines.length - 1 ? e4 ? i3.lines.recycle().copyFrom(s3) : i3.lines.push(s3.clone()) : i3.lines.splice(n3 + 1, 0, s3.clone()), e4 ? this.isUserScrolling && (i3.ydisp = Math.max(i3.ydisp - 1, 0)) : (i3.ybase++, this.isUserScrolling || i3.ydisp++);
          } else {
            const e4 = n3 - r3 + 1;
            i3.lines.shiftElements(r3 + 1, e4 - 1, -1), i3.lines.set(n3, s3.clone());
          }
          this.isUserScrolling || (i3.ydisp = i3.ybase), this._onScroll.fire(i3.ydisp);
        }
        scrollLines(e3, t4, i3) {
          const s3 = this.buffer;
          if (e3 < 0) {
            if (0 === s3.ydisp) return;
            this.isUserScrolling = true;
          } else e3 + s3.ydisp >= s3.ybase && (this.isUserScrolling = false);
          const r3 = s3.ydisp;
          s3.ydisp = Math.max(Math.min(s3.ydisp + e3, s3.ybase), 0), r3 !== s3.ydisp && (t4 || this._onScroll.fire(s3.ydisp));
        }
      };
      t3.BufferService = c = s2([r2(0, h.IOptionsService)], c);
    }, 7994: (e2, t3) => {
      Object.defineProperty(t3, "__esModule", { value: true }), t3.CharsetService = void 0, t3.CharsetService = class {
        constructor() {
          this.glevel = 0, this._charsets = [];
        }
        reset() {
          this.charset = void 0, this._charsets = [], this.glevel = 0;
        }
        setgLevel(e3) {
          this.glevel = e3, this.charset = this._charsets[e3];
        }
        setgCharset(e3, t4) {
          this._charsets[e3] = t4, this.glevel === e3 && (this.charset = t4);
        }
      };
    }, 1753: function(e2, t3, i2) {
      var s2 = this && this.__decorate || function(e3, t4, i3, s3) {
        var r3, n3 = arguments.length, o2 = n3 < 3 ? t4 : null === s3 ? s3 = Object.getOwnPropertyDescriptor(t4, i3) : s3;
        if ("object" == typeof Reflect && "function" == typeof Reflect.decorate) o2 = Reflect.decorate(e3, t4, i3, s3);
        else for (var a2 = e3.length - 1; a2 >= 0; a2--) (r3 = e3[a2]) && (o2 = (n3 < 3 ? r3(o2) : n3 > 3 ? r3(t4, i3, o2) : r3(t4, i3)) || o2);
        return n3 > 3 && o2 && Object.defineProperty(t4, i3, o2), o2;
      }, r2 = this && this.__param || function(e3, t4) {
        return function(i3, s3) {
          t4(i3, s3, e3);
        };
      };
      Object.defineProperty(t3, "__esModule", { value: true }), t3.CoreMouseService = void 0;
      const n2 = i2(2585), o = i2(8460), a = i2(844), h = { NONE: { events: 0, restrict: () => false }, X10: { events: 1, restrict: (e3) => 4 !== e3.button && 1 === e3.action && (e3.ctrl = false, e3.alt = false, e3.shift = false, true) }, VT200: { events: 19, restrict: (e3) => 32 !== e3.action }, DRAG: { events: 23, restrict: (e3) => 32 !== e3.action || 3 !== e3.button }, ANY: { events: 31, restrict: (e3) => true } };
      function c(e3, t4) {
        let i3 = (e3.ctrl ? 16 : 0) | (e3.shift ? 4 : 0) | (e3.alt ? 8 : 0);
        return 4 === e3.button ? (i3 |= 64, i3 |= e3.action) : (i3 |= 3 & e3.button, 4 & e3.button && (i3 |= 64), 8 & e3.button && (i3 |= 128), 32 === e3.action ? i3 |= 32 : 0 !== e3.action || t4 || (i3 |= 3)), i3;
      }
      const l2 = String.fromCharCode, d = { DEFAULT: (e3) => {
        const t4 = [c(e3, false) + 32, e3.col + 32, e3.row + 32];
        return t4[0] > 255 || t4[1] > 255 || t4[2] > 255 ? "" : `\x1B[M${l2(t4[0])}${l2(t4[1])}${l2(t4[2])}`;
      }, SGR: (e3) => {
        const t4 = 0 === e3.action && 4 !== e3.button ? "m" : "M";
        return `\x1B[<${c(e3, true)};${e3.col};${e3.row}${t4}`;
      }, SGR_PIXELS: (e3) => {
        const t4 = 0 === e3.action && 4 !== e3.button ? "m" : "M";
        return `\x1B[<${c(e3, true)};${e3.x};${e3.y}${t4}`;
      } };
      let _ = t3.CoreMouseService = class extends a.Disposable {
        constructor(e3, t4) {
          super(), this._bufferService = e3, this._coreService = t4, this._protocols = {}, this._encodings = {}, this._activeProtocol = "", this._activeEncoding = "", this._lastEvent = null, this._onProtocolChange = this.register(new o.EventEmitter()), this.onProtocolChange = this._onProtocolChange.event;
          for (const e4 of Object.keys(h)) this.addProtocol(e4, h[e4]);
          for (const e4 of Object.keys(d)) this.addEncoding(e4, d[e4]);
          this.reset();
        }
        addProtocol(e3, t4) {
          this._protocols[e3] = t4;
        }
        addEncoding(e3, t4) {
          this._encodings[e3] = t4;
        }
        get activeProtocol() {
          return this._activeProtocol;
        }
        get areMouseEventsActive() {
          return 0 !== this._protocols[this._activeProtocol].events;
        }
        set activeProtocol(e3) {
          if (!this._protocols[e3]) throw new Error(`unknown protocol "${e3}"`);
          this._activeProtocol = e3, this._onProtocolChange.fire(this._protocols[e3].events);
        }
        get activeEncoding() {
          return this._activeEncoding;
        }
        set activeEncoding(e3) {
          if (!this._encodings[e3]) throw new Error(`unknown encoding "${e3}"`);
          this._activeEncoding = e3;
        }
        reset() {
          this.activeProtocol = "NONE", this.activeEncoding = "DEFAULT", this._lastEvent = null;
        }
        triggerMouseEvent(e3) {
          if (e3.col < 0 || e3.col >= this._bufferService.cols || e3.row < 0 || e3.row >= this._bufferService.rows) return false;
          if (4 === e3.button && 32 === e3.action) return false;
          if (3 === e3.button && 32 !== e3.action) return false;
          if (4 !== e3.button && (2 === e3.action || 3 === e3.action)) return false;
          if (e3.col++, e3.row++, 32 === e3.action && this._lastEvent && this._equalEvents(this._lastEvent, e3, "SGR_PIXELS" === this._activeEncoding)) return false;
          if (!this._protocols[this._activeProtocol].restrict(e3)) return false;
          const t4 = this._encodings[this._activeEncoding](e3);
          return t4 && ("DEFAULT" === this._activeEncoding ? this._coreService.triggerBinaryEvent(t4) : this._coreService.triggerDataEvent(t4, true)), this._lastEvent = e3, true;
        }
        explainEvents(e3) {
          return { down: !!(1 & e3), up: !!(2 & e3), drag: !!(4 & e3), move: !!(8 & e3), wheel: !!(16 & e3) };
        }
        _equalEvents(e3, t4, i3) {
          if (i3) {
            if (e3.x !== t4.x) return false;
            if (e3.y !== t4.y) return false;
          } else {
            if (e3.col !== t4.col) return false;
            if (e3.row !== t4.row) return false;
          }
          return e3.button === t4.button && e3.action === t4.action && e3.ctrl === t4.ctrl && e3.alt === t4.alt && e3.shift === t4.shift;
        }
      };
      t3.CoreMouseService = _ = s2([r2(0, n2.IBufferService), r2(1, n2.ICoreService)], _);
    }, 6975: function(e2, t3, i2) {
      var s2 = this && this.__decorate || function(e3, t4, i3, s3) {
        var r3, n3 = arguments.length, o2 = n3 < 3 ? t4 : null === s3 ? s3 = Object.getOwnPropertyDescriptor(t4, i3) : s3;
        if ("object" == typeof Reflect && "function" == typeof Reflect.decorate) o2 = Reflect.decorate(e3, t4, i3, s3);
        else for (var a2 = e3.length - 1; a2 >= 0; a2--) (r3 = e3[a2]) && (o2 = (n3 < 3 ? r3(o2) : n3 > 3 ? r3(t4, i3, o2) : r3(t4, i3)) || o2);
        return n3 > 3 && o2 && Object.defineProperty(t4, i3, o2), o2;
      }, r2 = this && this.__param || function(e3, t4) {
        return function(i3, s3) {
          t4(i3, s3, e3);
        };
      };
      Object.defineProperty(t3, "__esModule", { value: true }), t3.CoreService = void 0;
      const n2 = i2(1439), o = i2(8460), a = i2(844), h = i2(2585), c = Object.freeze({ insertMode: false }), l2 = Object.freeze({ applicationCursorKeys: false, applicationKeypad: false, bracketedPasteMode: false, origin: false, reverseWraparound: false, sendFocus: false, wraparound: true });
      let d = t3.CoreService = class extends a.Disposable {
        constructor(e3, t4, i3) {
          super(), this._bufferService = e3, this._logService = t4, this._optionsService = i3, this.isCursorInitialized = false, this.isCursorHidden = false, this._onData = this.register(new o.EventEmitter()), this.onData = this._onData.event, this._onUserInput = this.register(new o.EventEmitter()), this.onUserInput = this._onUserInput.event, this._onBinary = this.register(new o.EventEmitter()), this.onBinary = this._onBinary.event, this._onRequestScrollToBottom = this.register(new o.EventEmitter()), this.onRequestScrollToBottom = this._onRequestScrollToBottom.event, this.modes = (0, n2.clone)(c), this.decPrivateModes = (0, n2.clone)(l2);
        }
        reset() {
          this.modes = (0, n2.clone)(c), this.decPrivateModes = (0, n2.clone)(l2);
        }
        triggerDataEvent(e3, t4 = false) {
          if (this._optionsService.rawOptions.disableStdin) return;
          const i3 = this._bufferService.buffer;
          t4 && this._optionsService.rawOptions.scrollOnUserInput && i3.ybase !== i3.ydisp && this._onRequestScrollToBottom.fire(), t4 && this._onUserInput.fire(), this._logService.debug(`sending data "${e3}"`, () => e3.split("").map((e4) => e4.charCodeAt(0))), this._onData.fire(e3);
        }
        triggerBinaryEvent(e3) {
          this._optionsService.rawOptions.disableStdin || (this._logService.debug(`sending binary "${e3}"`, () => e3.split("").map((e4) => e4.charCodeAt(0))), this._onBinary.fire(e3));
        }
      };
      t3.CoreService = d = s2([r2(0, h.IBufferService), r2(1, h.ILogService), r2(2, h.IOptionsService)], d);
    }, 9074: (e2, t3, i2) => {
      Object.defineProperty(t3, "__esModule", { value: true }), t3.DecorationService = void 0;
      const s2 = i2(8055), r2 = i2(8460), n2 = i2(844), o = i2(6106);
      let a = 0, h = 0;
      class c extends n2.Disposable {
        get decorations() {
          return this._decorations.values();
        }
        constructor() {
          super(), this._decorations = new o.SortedList((e3) => e3?.marker.line), this._onDecorationRegistered = this.register(new r2.EventEmitter()), this.onDecorationRegistered = this._onDecorationRegistered.event, this._onDecorationRemoved = this.register(new r2.EventEmitter()), this.onDecorationRemoved = this._onDecorationRemoved.event, this.register((0, n2.toDisposable)(() => this.reset()));
        }
        registerDecoration(e3) {
          if (e3.marker.isDisposed) return;
          const t4 = new l2(e3);
          if (t4) {
            const e4 = t4.marker.onDispose(() => t4.dispose());
            t4.onDispose(() => {
              t4 && (this._decorations.delete(t4) && this._onDecorationRemoved.fire(t4), e4.dispose());
            }), this._decorations.insert(t4), this._onDecorationRegistered.fire(t4);
          }
          return t4;
        }
        reset() {
          for (const e3 of this._decorations.values()) e3.dispose();
          this._decorations.clear();
        }
        *getDecorationsAtCell(e3, t4, i3) {
          let s3 = 0, r3 = 0;
          for (const n3 of this._decorations.getKeyIterator(t4)) s3 = n3.options.x ?? 0, r3 = s3 + (n3.options.width ?? 1), e3 >= s3 && e3 < r3 && (!i3 || (n3.options.layer ?? "bottom") === i3) && (yield n3);
        }
        forEachDecorationAtCell(e3, t4, i3, s3) {
          this._decorations.forEachByKey(t4, (t5) => {
            a = t5.options.x ?? 0, h = a + (t5.options.width ?? 1), e3 >= a && e3 < h && (!i3 || (t5.options.layer ?? "bottom") === i3) && s3(t5);
          });
        }
      }
      t3.DecorationService = c;
      class l2 extends n2.Disposable {
        get isDisposed() {
          return this._isDisposed;
        }
        get backgroundColorRGB() {
          return null === this._cachedBg && (this.options.backgroundColor ? this._cachedBg = s2.css.toColor(this.options.backgroundColor) : this._cachedBg = void 0), this._cachedBg;
        }
        get foregroundColorRGB() {
          return null === this._cachedFg && (this.options.foregroundColor ? this._cachedFg = s2.css.toColor(this.options.foregroundColor) : this._cachedFg = void 0), this._cachedFg;
        }
        constructor(e3) {
          super(), this.options = e3, this.onRenderEmitter = this.register(new r2.EventEmitter()), this.onRender = this.onRenderEmitter.event, this._onDispose = this.register(new r2.EventEmitter()), this.onDispose = this._onDispose.event, this._cachedBg = null, this._cachedFg = null, this.marker = e3.marker, this.options.overviewRulerOptions && !this.options.overviewRulerOptions.position && (this.options.overviewRulerOptions.position = "full");
        }
        dispose() {
          this._onDispose.fire(), super.dispose();
        }
      }
    }, 4348: (e2, t3, i2) => {
      Object.defineProperty(t3, "__esModule", { value: true }), t3.InstantiationService = t3.ServiceCollection = void 0;
      const s2 = i2(2585), r2 = i2(8343);
      class n2 {
        constructor(...e3) {
          this._entries = /* @__PURE__ */ new Map();
          for (const [t4, i3] of e3) this.set(t4, i3);
        }
        set(e3, t4) {
          const i3 = this._entries.get(e3);
          return this._entries.set(e3, t4), i3;
        }
        forEach(e3) {
          for (const [t4, i3] of this._entries.entries()) e3(t4, i3);
        }
        has(e3) {
          return this._entries.has(e3);
        }
        get(e3) {
          return this._entries.get(e3);
        }
      }
      t3.ServiceCollection = n2, t3.InstantiationService = class {
        constructor() {
          this._services = new n2(), this._services.set(s2.IInstantiationService, this);
        }
        setService(e3, t4) {
          this._services.set(e3, t4);
        }
        getService(e3) {
          return this._services.get(e3);
        }
        createInstance(e3, ...t4) {
          const i3 = (0, r2.getServiceDependencies)(e3).sort((e4, t5) => e4.index - t5.index), s3 = [];
          for (const t5 of i3) {
            const i4 = this._services.get(t5.id);
            if (!i4) throw new Error(`[createInstance] ${e3.name} depends on UNKNOWN service ${t5.id}.`);
            s3.push(i4);
          }
          const n3 = i3.length > 0 ? i3[0].index : t4.length;
          if (t4.length !== n3) throw new Error(`[createInstance] First service dependency of ${e3.name} at position ${n3 + 1} conflicts with ${t4.length} static arguments`);
          return new e3(...[...t4, ...s3]);
        }
      };
    }, 7866: function(e2, t3, i2) {
      var s2 = this && this.__decorate || function(e3, t4, i3, s3) {
        var r3, n3 = arguments.length, o2 = n3 < 3 ? t4 : null === s3 ? s3 = Object.getOwnPropertyDescriptor(t4, i3) : s3;
        if ("object" == typeof Reflect && "function" == typeof Reflect.decorate) o2 = Reflect.decorate(e3, t4, i3, s3);
        else for (var a2 = e3.length - 1; a2 >= 0; a2--) (r3 = e3[a2]) && (o2 = (n3 < 3 ? r3(o2) : n3 > 3 ? r3(t4, i3, o2) : r3(t4, i3)) || o2);
        return n3 > 3 && o2 && Object.defineProperty(t4, i3, o2), o2;
      }, r2 = this && this.__param || function(e3, t4) {
        return function(i3, s3) {
          t4(i3, s3, e3);
        };
      };
      Object.defineProperty(t3, "__esModule", { value: true }), t3.traceCall = t3.setTraceLogger = t3.LogService = void 0;
      const n2 = i2(844), o = i2(2585), a = { trace: o.LogLevelEnum.TRACE, debug: o.LogLevelEnum.DEBUG, info: o.LogLevelEnum.INFO, warn: o.LogLevelEnum.WARN, error: o.LogLevelEnum.ERROR, off: o.LogLevelEnum.OFF };
      let h, c = t3.LogService = class extends n2.Disposable {
        get logLevel() {
          return this._logLevel;
        }
        constructor(e3) {
          super(), this._optionsService = e3, this._logLevel = o.LogLevelEnum.OFF, this._updateLogLevel(), this.register(this._optionsService.onSpecificOptionChange("logLevel", () => this._updateLogLevel())), h = this;
        }
        _updateLogLevel() {
          this._logLevel = a[this._optionsService.rawOptions.logLevel];
        }
        _evalLazyOptionalParams(e3) {
          for (let t4 = 0; t4 < e3.length; t4++) "function" == typeof e3[t4] && (e3[t4] = e3[t4]());
        }
        _log(e3, t4, i3) {
          this._evalLazyOptionalParams(i3), e3.call(console, (this._optionsService.options.logger ? "" : "xterm.js: ") + t4, ...i3);
        }
        trace(e3, ...t4) {
          this._logLevel <= o.LogLevelEnum.TRACE && this._log(this._optionsService.options.logger?.trace.bind(this._optionsService.options.logger) ?? console.log, e3, t4);
        }
        debug(e3, ...t4) {
          this._logLevel <= o.LogLevelEnum.DEBUG && this._log(this._optionsService.options.logger?.debug.bind(this._optionsService.options.logger) ?? console.log, e3, t4);
        }
        info(e3, ...t4) {
          this._logLevel <= o.LogLevelEnum.INFO && this._log(this._optionsService.options.logger?.info.bind(this._optionsService.options.logger) ?? console.info, e3, t4);
        }
        warn(e3, ...t4) {
          this._logLevel <= o.LogLevelEnum.WARN && this._log(this._optionsService.options.logger?.warn.bind(this._optionsService.options.logger) ?? console.warn, e3, t4);
        }
        error(e3, ...t4) {
          this._logLevel <= o.LogLevelEnum.ERROR && this._log(this._optionsService.options.logger?.error.bind(this._optionsService.options.logger) ?? console.error, e3, t4);
        }
      };
      t3.LogService = c = s2([r2(0, o.IOptionsService)], c), t3.setTraceLogger = function(e3) {
        h = e3;
      }, t3.traceCall = function(e3, t4, i3) {
        if ("function" != typeof i3.value) throw new Error("not supported");
        const s3 = i3.value;
        i3.value = function(...e4) {
          if (h.logLevel !== o.LogLevelEnum.TRACE) return s3.apply(this, e4);
          h.trace(`GlyphRenderer#${s3.name}(${e4.map((e5) => JSON.stringify(e5)).join(", ")})`);
          const t5 = s3.apply(this, e4);
          return h.trace(`GlyphRenderer#${s3.name} return`, t5), t5;
        };
      };
    }, 7302: (e2, t3, i2) => {
      Object.defineProperty(t3, "__esModule", { value: true }), t3.OptionsService = t3.DEFAULT_OPTIONS = void 0;
      const s2 = i2(8460), r2 = i2(844), n2 = i2(6114);
      t3.DEFAULT_OPTIONS = { cols: 80, rows: 24, cursorBlink: false, cursorStyle: "block", cursorWidth: 1, cursorInactiveStyle: "outline", customGlyphs: true, drawBoldTextInBrightColors: true, documentOverride: null, fastScrollModifier: "alt", fastScrollSensitivity: 5, fontFamily: "courier-new, courier, monospace", fontSize: 15, fontWeight: "normal", fontWeightBold: "bold", ignoreBracketedPasteMode: false, lineHeight: 1, letterSpacing: 0, linkHandler: null, logLevel: "info", logger: null, scrollback: 1e3, scrollOnUserInput: true, scrollSensitivity: 1, screenReaderMode: false, smoothScrollDuration: 0, macOptionIsMeta: false, macOptionClickForcesSelection: false, minimumContrastRatio: 1, disableStdin: false, allowProposedApi: false, allowTransparency: false, tabStopWidth: 8, theme: {}, rescaleOverlappingGlyphs: false, rightClickSelectsWord: n2.isMac, windowOptions: {}, windowsMode: false, windowsPty: {}, wordSeparator: " ()[]{}',\"`", altClickMovesCursor: true, convertEol: false, termName: "xterm", cancelEvents: false, overviewRulerWidth: 0 };
      const o = ["normal", "bold", "100", "200", "300", "400", "500", "600", "700", "800", "900"];
      class a extends r2.Disposable {
        constructor(e3) {
          super(), this._onOptionChange = this.register(new s2.EventEmitter()), this.onOptionChange = this._onOptionChange.event;
          const i3 = { ...t3.DEFAULT_OPTIONS };
          for (const t4 in e3) if (t4 in i3) try {
            const s3 = e3[t4];
            i3[t4] = this._sanitizeAndValidateOption(t4, s3);
          } catch (e4) {
            console.error(e4);
          }
          this.rawOptions = i3, this.options = { ...i3 }, this._setupOptions(), this.register((0, r2.toDisposable)(() => {
            this.rawOptions.linkHandler = null, this.rawOptions.documentOverride = null;
          }));
        }
        onSpecificOptionChange(e3, t4) {
          return this.onOptionChange((i3) => {
            i3 === e3 && t4(this.rawOptions[e3]);
          });
        }
        onMultipleOptionChange(e3, t4) {
          return this.onOptionChange((i3) => {
            -1 !== e3.indexOf(i3) && t4();
          });
        }
        _setupOptions() {
          const e3 = (e4) => {
            if (!(e4 in t3.DEFAULT_OPTIONS)) throw new Error(`No option with key "${e4}"`);
            return this.rawOptions[e4];
          }, i3 = (e4, i4) => {
            if (!(e4 in t3.DEFAULT_OPTIONS)) throw new Error(`No option with key "${e4}"`);
            i4 = this._sanitizeAndValidateOption(e4, i4), this.rawOptions[e4] !== i4 && (this.rawOptions[e4] = i4, this._onOptionChange.fire(e4));
          };
          for (const t4 in this.rawOptions) {
            const s3 = { get: e3.bind(this, t4), set: i3.bind(this, t4) };
            Object.defineProperty(this.options, t4, s3);
          }
        }
        _sanitizeAndValidateOption(e3, i3) {
          switch (e3) {
            case "cursorStyle":
              if (i3 || (i3 = t3.DEFAULT_OPTIONS[e3]), !/* @__PURE__ */ function(e4) {
                return "block" === e4 || "underline" === e4 || "bar" === e4;
              }(i3)) throw new Error(`"${i3}" is not a valid value for ${e3}`);
              break;
            case "wordSeparator":
              i3 || (i3 = t3.DEFAULT_OPTIONS[e3]);
              break;
            case "fontWeight":
            case "fontWeightBold":
              if ("number" == typeof i3 && 1 <= i3 && i3 <= 1e3) break;
              i3 = o.includes(i3) ? i3 : t3.DEFAULT_OPTIONS[e3];
              break;
            case "cursorWidth":
              i3 = Math.floor(i3);
            case "lineHeight":
            case "tabStopWidth":
              if (i3 < 1) throw new Error(`${e3} cannot be less than 1, value: ${i3}`);
              break;
            case "minimumContrastRatio":
              i3 = Math.max(1, Math.min(21, Math.round(10 * i3) / 10));
              break;
            case "scrollback":
              if ((i3 = Math.min(i3, 4294967295)) < 0) throw new Error(`${e3} cannot be less than 0, value: ${i3}`);
              break;
            case "fastScrollSensitivity":
            case "scrollSensitivity":
              if (i3 <= 0) throw new Error(`${e3} cannot be less than or equal to 0, value: ${i3}`);
              break;
            case "rows":
            case "cols":
              if (!i3 && 0 !== i3) throw new Error(`${e3} must be numeric, value: ${i3}`);
              break;
            case "windowsPty":
              i3 = i3 ?? {};
          }
          return i3;
        }
      }
      t3.OptionsService = a;
    }, 2660: function(e2, t3, i2) {
      var s2 = this && this.__decorate || function(e3, t4, i3, s3) {
        var r3, n3 = arguments.length, o2 = n3 < 3 ? t4 : null === s3 ? s3 = Object.getOwnPropertyDescriptor(t4, i3) : s3;
        if ("object" == typeof Reflect && "function" == typeof Reflect.decorate) o2 = Reflect.decorate(e3, t4, i3, s3);
        else for (var a = e3.length - 1; a >= 0; a--) (r3 = e3[a]) && (o2 = (n3 < 3 ? r3(o2) : n3 > 3 ? r3(t4, i3, o2) : r3(t4, i3)) || o2);
        return n3 > 3 && o2 && Object.defineProperty(t4, i3, o2), o2;
      }, r2 = this && this.__param || function(e3, t4) {
        return function(i3, s3) {
          t4(i3, s3, e3);
        };
      };
      Object.defineProperty(t3, "__esModule", { value: true }), t3.OscLinkService = void 0;
      const n2 = i2(2585);
      let o = t3.OscLinkService = class {
        constructor(e3) {
          this._bufferService = e3, this._nextId = 1, this._entriesWithId = /* @__PURE__ */ new Map(), this._dataByLinkId = /* @__PURE__ */ new Map();
        }
        registerLink(e3) {
          const t4 = this._bufferService.buffer;
          if (void 0 === e3.id) {
            const i4 = t4.addMarker(t4.ybase + t4.y), s4 = { data: e3, id: this._nextId++, lines: [i4] };
            return i4.onDispose(() => this._removeMarkerFromLink(s4, i4)), this._dataByLinkId.set(s4.id, s4), s4.id;
          }
          const i3 = e3, s3 = this._getEntryIdKey(i3), r3 = this._entriesWithId.get(s3);
          if (r3) return this.addLineToLink(r3.id, t4.ybase + t4.y), r3.id;
          const n3 = t4.addMarker(t4.ybase + t4.y), o2 = { id: this._nextId++, key: this._getEntryIdKey(i3), data: i3, lines: [n3] };
          return n3.onDispose(() => this._removeMarkerFromLink(o2, n3)), this._entriesWithId.set(o2.key, o2), this._dataByLinkId.set(o2.id, o2), o2.id;
        }
        addLineToLink(e3, t4) {
          const i3 = this._dataByLinkId.get(e3);
          if (i3 && i3.lines.every((e4) => e4.line !== t4)) {
            const e4 = this._bufferService.buffer.addMarker(t4);
            i3.lines.push(e4), e4.onDispose(() => this._removeMarkerFromLink(i3, e4));
          }
        }
        getLinkData(e3) {
          return this._dataByLinkId.get(e3)?.data;
        }
        _getEntryIdKey(e3) {
          return `${e3.id};;${e3.uri}`;
        }
        _removeMarkerFromLink(e3, t4) {
          const i3 = e3.lines.indexOf(t4);
          -1 !== i3 && (e3.lines.splice(i3, 1), 0 === e3.lines.length && (void 0 !== e3.data.id && this._entriesWithId.delete(e3.key), this._dataByLinkId.delete(e3.id)));
        }
      };
      t3.OscLinkService = o = s2([r2(0, n2.IBufferService)], o);
    }, 8343: (e2, t3) => {
      Object.defineProperty(t3, "__esModule", { value: true }), t3.createDecorator = t3.getServiceDependencies = t3.serviceRegistry = void 0;
      const i2 = "di$target", s2 = "di$dependencies";
      t3.serviceRegistry = /* @__PURE__ */ new Map(), t3.getServiceDependencies = function(e3) {
        return e3[s2] || [];
      }, t3.createDecorator = function(e3) {
        if (t3.serviceRegistry.has(e3)) return t3.serviceRegistry.get(e3);
        const r2 = function(e4, t4, n2) {
          if (3 !== arguments.length) throw new Error("@IServiceName-decorator can only be used to decorate a parameter");
          !function(e5, t5, r3) {
            t5[i2] === t5 ? t5[s2].push({ id: e5, index: r3 }) : (t5[s2] = [{ id: e5, index: r3 }], t5[i2] = t5);
          }(r2, e4, n2);
        };
        return r2.toString = () => e3, t3.serviceRegistry.set(e3, r2), r2;
      };
    }, 2585: (e2, t3, i2) => {
      Object.defineProperty(t3, "__esModule", { value: true }), t3.IDecorationService = t3.IUnicodeService = t3.IOscLinkService = t3.IOptionsService = t3.ILogService = t3.LogLevelEnum = t3.IInstantiationService = t3.ICharsetService = t3.ICoreService = t3.ICoreMouseService = t3.IBufferService = void 0;
      const s2 = i2(8343);
      var r2;
      t3.IBufferService = (0, s2.createDecorator)("BufferService"), t3.ICoreMouseService = (0, s2.createDecorator)("CoreMouseService"), t3.ICoreService = (0, s2.createDecorator)("CoreService"), t3.ICharsetService = (0, s2.createDecorator)("CharsetService"), t3.IInstantiationService = (0, s2.createDecorator)("InstantiationService"), function(e3) {
        e3[e3.TRACE = 0] = "TRACE", e3[e3.DEBUG = 1] = "DEBUG", e3[e3.INFO = 2] = "INFO", e3[e3.WARN = 3] = "WARN", e3[e3.ERROR = 4] = "ERROR", e3[e3.OFF = 5] = "OFF";
      }(r2 || (t3.LogLevelEnum = r2 = {})), t3.ILogService = (0, s2.createDecorator)("LogService"), t3.IOptionsService = (0, s2.createDecorator)("OptionsService"), t3.IOscLinkService = (0, s2.createDecorator)("OscLinkService"), t3.IUnicodeService = (0, s2.createDecorator)("UnicodeService"), t3.IDecorationService = (0, s2.createDecorator)("DecorationService");
    }, 1480: (e2, t3, i2) => {
      Object.defineProperty(t3, "__esModule", { value: true }), t3.UnicodeService = void 0;
      const s2 = i2(8460), r2 = i2(225);
      class n2 {
        static extractShouldJoin(e3) {
          return 0 != (1 & e3);
        }
        static extractWidth(e3) {
          return e3 >> 1 & 3;
        }
        static extractCharKind(e3) {
          return e3 >> 3;
        }
        static createPropertyValue(e3, t4, i3 = false) {
          return (16777215 & e3) << 3 | (3 & t4) << 1 | (i3 ? 1 : 0);
        }
        constructor() {
          this._providers = /* @__PURE__ */ Object.create(null), this._active = "", this._onChange = new s2.EventEmitter(), this.onChange = this._onChange.event;
          const e3 = new r2.UnicodeV6();
          this.register(e3), this._active = e3.version, this._activeProvider = e3;
        }
        dispose() {
          this._onChange.dispose();
        }
        get versions() {
          return Object.keys(this._providers);
        }
        get activeVersion() {
          return this._active;
        }
        set activeVersion(e3) {
          if (!this._providers[e3]) throw new Error(`unknown Unicode version "${e3}"`);
          this._active = e3, this._activeProvider = this._providers[e3], this._onChange.fire(e3);
        }
        register(e3) {
          this._providers[e3.version] = e3;
        }
        wcwidth(e3) {
          return this._activeProvider.wcwidth(e3);
        }
        getStringCellWidth(e3) {
          let t4 = 0, i3 = 0;
          const s3 = e3.length;
          for (let r3 = 0; r3 < s3; ++r3) {
            let o = e3.charCodeAt(r3);
            if (55296 <= o && o <= 56319) {
              if (++r3 >= s3) return t4 + this.wcwidth(o);
              const i4 = e3.charCodeAt(r3);
              56320 <= i4 && i4 <= 57343 ? o = 1024 * (o - 55296) + i4 - 56320 + 65536 : t4 += this.wcwidth(i4);
            }
            const a = this.charProperties(o, i3);
            let h = n2.extractWidth(a);
            n2.extractShouldJoin(a) && (h -= n2.extractWidth(i3)), t4 += h, i3 = a;
          }
          return t4;
        }
        charProperties(e3, t4) {
          return this._activeProvider.charProperties(e3, t4);
        }
      }
      t3.UnicodeService = n2;
    } }, t2 = {};
    function i(s2) {
      var r2 = t2[s2];
      if (void 0 !== r2) return r2.exports;
      var n2 = t2[s2] = { exports: {} };
      return e[s2].call(n2.exports, n2, n2.exports, i), n2.exports;
    }
    var s = {};
    return (() => {
      var e2 = s;
      Object.defineProperty(e2, "__esModule", { value: true }), e2.Terminal = void 0;
      const t3 = i(9042), r2 = i(3236), n2 = i(844), o = i(5741), a = i(8285), h = i(7975), c = i(7090), l2 = ["cols", "rows"];
      class d extends n2.Disposable {
        constructor(e3) {
          super(), this._core = this.register(new r2.Terminal(e3)), this._addonManager = this.register(new o.AddonManager()), this._publicOptions = { ...this._core.options };
          const t4 = (e4) => this._core.options[e4], i2 = (e4, t5) => {
            this._checkReadonlyOptions(e4), this._core.options[e4] = t5;
          };
          for (const e4 in this._core.options) {
            const s2 = { get: t4.bind(this, e4), set: i2.bind(this, e4) };
            Object.defineProperty(this._publicOptions, e4, s2);
          }
        }
        _checkReadonlyOptions(e3) {
          if (l2.includes(e3)) throw new Error(`Option "${e3}" can only be set in the constructor`);
        }
        _checkProposedApi() {
          if (!this._core.optionsService.rawOptions.allowProposedApi) throw new Error("You must set the allowProposedApi option to true to use proposed API");
        }
        get onBell() {
          return this._core.onBell;
        }
        get onBinary() {
          return this._core.onBinary;
        }
        get onCursorMove() {
          return this._core.onCursorMove;
        }
        get onData() {
          return this._core.onData;
        }
        get onKey() {
          return this._core.onKey;
        }
        get onLineFeed() {
          return this._core.onLineFeed;
        }
        get onRender() {
          return this._core.onRender;
        }
        get onResize() {
          return this._core.onResize;
        }
        get onScroll() {
          return this._core.onScroll;
        }
        get onSelectionChange() {
          return this._core.onSelectionChange;
        }
        get onTitleChange() {
          return this._core.onTitleChange;
        }
        get onWriteParsed() {
          return this._core.onWriteParsed;
        }
        get element() {
          return this._core.element;
        }
        get parser() {
          return this._parser || (this._parser = new h.ParserApi(this._core)), this._parser;
        }
        get unicode() {
          return this._checkProposedApi(), new c.UnicodeApi(this._core);
        }
        get textarea() {
          return this._core.textarea;
        }
        get rows() {
          return this._core.rows;
        }
        get cols() {
          return this._core.cols;
        }
        get buffer() {
          return this._buffer || (this._buffer = this.register(new a.BufferNamespaceApi(this._core))), this._buffer;
        }
        get markers() {
          return this._checkProposedApi(), this._core.markers;
        }
        get modes() {
          const e3 = this._core.coreService.decPrivateModes;
          let t4 = "none";
          switch (this._core.coreMouseService.activeProtocol) {
            case "X10":
              t4 = "x10";
              break;
            case "VT200":
              t4 = "vt200";
              break;
            case "DRAG":
              t4 = "drag";
              break;
            case "ANY":
              t4 = "any";
          }
          return { applicationCursorKeysMode: e3.applicationCursorKeys, applicationKeypadMode: e3.applicationKeypad, bracketedPasteMode: e3.bracketedPasteMode, insertMode: this._core.coreService.modes.insertMode, mouseTrackingMode: t4, originMode: e3.origin, reverseWraparoundMode: e3.reverseWraparound, sendFocusMode: e3.sendFocus, wraparoundMode: e3.wraparound };
        }
        get options() {
          return this._publicOptions;
        }
        set options(e3) {
          for (const t4 in e3) this._publicOptions[t4] = e3[t4];
        }
        blur() {
          this._core.blur();
        }
        focus() {
          this._core.focus();
        }
        input(e3, t4 = true) {
          this._core.input(e3, t4);
        }
        resize(e3, t4) {
          this._verifyIntegers(e3, t4), this._core.resize(e3, t4);
        }
        open(e3) {
          this._core.open(e3);
        }
        attachCustomKeyEventHandler(e3) {
          this._core.attachCustomKeyEventHandler(e3);
        }
        attachCustomWheelEventHandler(e3) {
          this._core.attachCustomWheelEventHandler(e3);
        }
        registerLinkProvider(e3) {
          return this._core.registerLinkProvider(e3);
        }
        registerCharacterJoiner(e3) {
          return this._checkProposedApi(), this._core.registerCharacterJoiner(e3);
        }
        deregisterCharacterJoiner(e3) {
          this._checkProposedApi(), this._core.deregisterCharacterJoiner(e3);
        }
        registerMarker(e3 = 0) {
          return this._verifyIntegers(e3), this._core.registerMarker(e3);
        }
        registerDecoration(e3) {
          return this._checkProposedApi(), this._verifyPositiveIntegers(e3.x ?? 0, e3.width ?? 0, e3.height ?? 0), this._core.registerDecoration(e3);
        }
        hasSelection() {
          return this._core.hasSelection();
        }
        select(e3, t4, i2) {
          this._verifyIntegers(e3, t4, i2), this._core.select(e3, t4, i2);
        }
        getSelection() {
          return this._core.getSelection();
        }
        getSelectionPosition() {
          return this._core.getSelectionPosition();
        }
        clearSelection() {
          this._core.clearSelection();
        }
        selectAll() {
          this._core.selectAll();
        }
        selectLines(e3, t4) {
          this._verifyIntegers(e3, t4), this._core.selectLines(e3, t4);
        }
        dispose() {
          super.dispose();
        }
        scrollLines(e3) {
          this._verifyIntegers(e3), this._core.scrollLines(e3);
        }
        scrollPages(e3) {
          this._verifyIntegers(e3), this._core.scrollPages(e3);
        }
        scrollToTop() {
          this._core.scrollToTop();
        }
        scrollToBottom() {
          this._core.scrollToBottom();
        }
        scrollToLine(e3) {
          this._verifyIntegers(e3), this._core.scrollToLine(e3);
        }
        clear() {
          this._core.clear();
        }
        write(e3, t4) {
          this._core.write(e3, t4);
        }
        writeln(e3, t4) {
          this._core.write(e3), this._core.write("\r\n", t4);
        }
        paste(e3) {
          this._core.paste(e3);
        }
        refresh(e3, t4) {
          this._verifyIntegers(e3, t4), this._core.refresh(e3, t4);
        }
        reset() {
          this._core.reset();
        }
        clearTextureAtlas() {
          this._core.clearTextureAtlas();
        }
        loadAddon(e3) {
          this._addonManager.loadAddon(this, e3);
        }
        static get strings() {
          return t3;
        }
        _verifyIntegers(...e3) {
          for (const t4 of e3) if (t4 === 1 / 0 || isNaN(t4) || t4 % 1 != 0) throw new Error("This API only accepts integers");
        }
        _verifyPositiveIntegers(...e3) {
          for (const t4 of e3) if (t4 && (t4 === 1 / 0 || isNaN(t4) || t4 % 1 != 0 || t4 < 0)) throw new Error("This API only accepts positive integers");
        }
      }
      e2.Terminal = d;
    })(), s;
  })());
})(xterm);
var xtermExports = xterm.exports;
var addonFit = { exports: {} };
(function(module, exports) {
  !function(e, t2) {
    module.exports = t2();
  }(self, () => (() => {
    var e = {};
    return (() => {
      var t2 = e;
      Object.defineProperty(t2, "__esModule", { value: true }), t2.FitAddon = void 0, t2.FitAddon = class {
        activate(e2) {
          this._terminal = e2;
        }
        dispose() {
        }
        fit() {
          const e2 = this.proposeDimensions();
          if (!e2 || !this._terminal || isNaN(e2.cols) || isNaN(e2.rows)) return;
          const t3 = this._terminal._core;
          this._terminal.rows === e2.rows && this._terminal.cols === e2.cols || (t3._renderService.clear(), this._terminal.resize(e2.cols, e2.rows));
        }
        proposeDimensions() {
          if (!this._terminal) return;
          if (!this._terminal.element || !this._terminal.element.parentElement) return;
          const e2 = this._terminal._core, t3 = e2._renderService.dimensions;
          if (0 === t3.css.cell.width || 0 === t3.css.cell.height) return;
          const r2 = 0 === this._terminal.options.scrollback ? 0 : e2.viewport.scrollBarWidth, i = window.getComputedStyle(this._terminal.element.parentElement), o = parseInt(i.getPropertyValue("height")), s = Math.max(0, parseInt(i.getPropertyValue("width"))), n2 = window.getComputedStyle(this._terminal.element), l2 = o - (parseInt(n2.getPropertyValue("padding-top")) + parseInt(n2.getPropertyValue("padding-bottom"))), a = s - (parseInt(n2.getPropertyValue("padding-right")) + parseInt(n2.getPropertyValue("padding-left"))) - r2;
          return { cols: Math.max(2, Math.floor(a / t3.css.cell.width)), rows: Math.max(1, Math.floor(l2 / t3.css.cell.height)) };
        }
      };
    })(), e;
  })());
})(addonFit);
var addonFitExports = addonFit.exports;
function TerminalView({ onStatus, onOutput, onEmotion }) {
  const containerRef = reactExports.useRef(null);
  reactExports.useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    let tagCarry = "";
    const term = new xtermExports.Terminal({
      cursorBlink: true,
      fontFamily: '"JetBrains Mono", "SFMono-Regular", ui-monospace, monospace',
      fontSize: 13,
      lineHeight: 1.25,
      allowTransparency: true,
      theme: {
        background: "rgba(0,0,0,0)",
        foreground: "#f3e9d8",
        cursor: "#f0a868",
        cursorAccent: "#1a1822",
        selectionBackground: "rgba(240,168,104,0.3)",
        black: "#2a2433",
        brightBlack: "#5b5468"
      }
    });
    const fit = new addonFitExports.FitAddon();
    term.loadAddon(fit);
    let inputSub;
    let offData;
    let offExit;
    let booted = false;
    const boot = () => {
      if (booted || !container.clientWidth || !container.clientHeight) return;
      booted = true;
      term.open(container);
      requestAnimationFrame(safeFit);
      inputSub = term.onData((data) => window.companion.sendInput(data));
      offData = window.companion.onTerminalData((data) => {
        const { text, emotions, carry } = splitForTagStream(tagCarry, data);
        tagCarry = carry;
        term.write(text);
        emotions.forEach(onEmotion);
        onOutput();
      });
      offExit = window.companion.onTerminalExit((code) => {
        term.write(`\r
\x1B[2m[claude session exited (${code})]\x1B[0m\r
`);
      });
      window.companion.startTerminal({ cols: term.cols, rows: term.rows }).then((res) => onStatus(res.status, res.ok));
    };
    const safeFit = () => {
      if (!booted || !container.clientWidth || !container.clientHeight) return;
      try {
        fit.fit();
      } catch {
        return;
      }
      window.companion.resizeTerminal({ cols: term.cols, rows: term.rows });
    };
    const ro = new ResizeObserver(() => {
      boot();
      safeFit();
    });
    ro.observe(container);
    boot();
    return () => {
      ro.disconnect();
      inputSub?.dispose();
      offData?.();
      offExit?.();
      term.dispose();
    };
  }, []);
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "terminal-view", ref: containerRef });
}
function ChatBox({ onSend }) {
  const [text, setText] = reactExports.useState("");
  const send = () => {
    const line = text.trim();
    if (!line) return;
    window.companion.sendInput(line + "\r");
    setText("");
    onSend();
  };
  const onSubmit = (e) => {
    e.preventDefault();
    send();
  };
  const onKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("form", { className: "chatbox", onSubmit, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      "textarea",
      {
        className: "chatbox-input",
        placeholder: "say something to your companion…",
        value: text,
        rows: 1,
        onChange: (e) => setText(e.target.value),
        onKeyDown
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "chatbox-send", type: "submit", "aria-label": "send", children: "↵" })
  ] });
}
const PLACEHOLDER = "placeholder";
function Settings(props) {
  const { models, selectedModel, personality } = props;
  const [draftPersonality, setDraftPersonality] = reactExports.useState(personality);
  const activeModel = models.find((m2) => m2.id === selectedModel);
  const personalityDirty = draftPersonality.trim() !== personality.trim();
  const onPreset = (id2) => {
    const preset = props.personas.find((p2) => p2.id === id2);
    if (preset) setDraftPersonality(preset.prompt);
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "settings-scrim", onClick: props.onClose, children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "settings", onClick: (e) => e.stopPropagation(), children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("header", { className: "settings-head", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { children: "Settings" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "icon-btn", onClick: props.onClose, title: "close", children: "✕" })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "settings-row", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("label", { children: "Avatar model" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "settings-field", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("select", { value: selectedModel, onChange: (e) => props.onSelectModel(e.target.value), children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: PLACEHOLDER, children: "Built-in companion (placeholder)" }),
          models.map((m2) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: m2.id, children: m2.name }, m2.id))
        ] }),
        activeModel?.license && /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "settings-note", children: [
          "License: ",
          activeModel.license,
          activeModel.author ? ` · ${activeModel.author}` : ""
        ] }),
        models.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "settings-note muted", children: [
          "No Live2D models found. Drop one under ",
          /* @__PURE__ */ jsxRuntimeExports.jsx("code", { children: "resources/models/<id>" }),
          " ",
          "and add the Cubism runtime to enable it."
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "settings-row", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("label", { children: "Personality" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "settings-field", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("select", { defaultValue: "", onChange: (e) => onPreset(e.target.value), children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "", disabled: true, children: "Choose a preset…" }),
          props.personas.map((p2) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: p2.id, children: p2.label }, p2.id))
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "textarea",
          {
            className: "settings-personality",
            rows: 4,
            placeholder: "Appended to Claude Code via --append-system-prompt. Leave empty for default.",
            value: draftPersonality,
            onChange: (e) => setDraftPersonality(e.target.value)
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            className: "settings-apply",
            disabled: !personalityDirty,
            onClick: () => props.onApplyPersonality(draftPersonality),
            children: "Apply & restart session"
          }
        )
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "settings-row", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("label", { children: "Start directory" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "settings-field", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("code", { className: "settings-path", children: props.projectDir ?? "…" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "settings-apply", onClick: props.onChangeDir, children: "Change…" })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "settings-row", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("label", { children: "Behavior" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "settings-field settings-toggles", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "settings-check", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "checkbox", checked: props.reactionsOn, onChange: props.onToggleReactions }),
          "Avatar reactions (installs Claude Code hooks)"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "settings-check", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("input", { type: "checkbox", checked: props.voiceEnabled, onChange: props.onToggleVoice }),
          "Speak replies aloud (TTS)"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "settings-check", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              type: "checkbox",
              checked: props.micOn,
              disabled: !props.asrAvailable,
              onChange: props.onToggleMic
            }
          ),
          "Voice input — speak to the companion (offline ASR)"
        ] }),
        !props.asrAvailable && /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "settings-note muted", children: [
          "Voice input needs an offline ASR model. ",
          props.asrReason
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("footer", { className: "settings-foot muted", children: "Uses your existing Claude Code login — never an Anthropic API key." })
  ] }) });
}
const PLACEHOLDER_MODEL = "placeholder";
function basename(p2) {
  const parts = p2.split(/[\\/]/).filter(Boolean);
  return parts[parts.length - 1] ?? p2;
}
function App() {
  const [cli, setCli] = reactExports.useState(null);
  const [sessionOk, setSessionOk] = reactExports.useState(null);
  const [pose, setPose] = reactExports.useState("idle");
  const [expression, setExpression] = reactExports.useState(void 0);
  const [showTerminal, setShowTerminal] = reactExports.useState(true);
  const [hooks, setHooks] = reactExports.useState(null);
  const [notice, setNotice] = reactExports.useState(null);
  const [projectDir, setProjectDir] = reactExports.useState(null);
  const [voiceEnabled, setVoiceEnabled] = reactExports.useState(false);
  const [models, setModels] = reactExports.useState([]);
  const [customPersonas, setCustomPersonas] = reactExports.useState([]);
  const [selectedModel, setSelectedModel] = reactExports.useState(PLACEHOLDER_MODEL);
  const [personality, setPersonality] = reactExports.useState("");
  const [showSettings, setShowSettings] = reactExports.useState(false);
  const [sessionNonce, setSessionNonce] = reactExports.useState(0);
  const [micOn, setMicOn] = reactExports.useState(false);
  const [asr, setAsr] = reactExports.useState(null);
  const [caption, setCaption] = reactExports.useState(null);
  const [activity, setActivity] = reactExports.useState(null);
  const idleTimer = reactExports.useRef(void 0);
  const noticeTimer = reactExports.useRef(void 0);
  const micRef = reactExports.useRef(null);
  const micPrefRef = reactExports.useRef(false);
  const micAutoStarted = reactExports.useRef(false);
  reactExports.useEffect(() => {
    window.companion.detectCli().then(setCli);
    window.companion.hooksStatus().then(setHooks);
    window.companion.listModels().then(setModels);
    window.companion.listPersonas().then(setCustomPersonas);
    window.companion.asrStatus().then(setAsr);
    window.companion.getSettings().then((s) => {
      setProjectDir(s.projectDir);
      setVoiceEnabled(s.voice);
      setSelectedModel(s.avatarModel || PLACEHOLDER_MODEL);
      setPersonality(s.personality);
      micPrefRef.current = s.mic;
    });
    return () => micRef.current?.stop();
  }, []);
  const flashNotice = reactExports.useCallback((text) => {
    setNotice(text);
    window.clearTimeout(noticeTimer.current);
    noticeTimer.current = window.setTimeout(() => setNotice(null), 6e3);
  }, []);
  const scheduleIdle = reactExports.useCallback((delay = 1400) => {
    window.clearTimeout(idleTimer.current);
    idleTimer.current = window.setTimeout(() => setPose("idle"), delay);
  }, []);
  reactExports.useEffect(() => {
    return window.companion.onAvatarCue((cue) => {
      window.clearTimeout(idleTimer.current);
      if (cue.pose) {
        setPose(cue.pose);
        if (cue.pose === "thinking" || cue.pose === "listening") setExpression("neutral");
        if (cue.pose === "idle") setActivity(null);
      }
      if (cue.expression) setExpression(cue.expression);
      if (cue.message) flashNotice(cue.message);
      const act = describeActivity(cue.source);
      if (act) setActivity(act);
    });
  }, [flashNotice]);
  const handleOutput = reactExports.useCallback(() => {
    if (hooks?.installed) return;
    setPose("working");
    scheduleIdle();
  }, [hooks, scheduleIdle]);
  const handleSend = reactExports.useCallback(() => {
    setPose("listening");
    setExpression("neutral");
    scheduleIdle(2200);
  }, [scheduleIdle]);
  const handleEmotion = reactExports.useCallback((emotion) => setExpression(emotion), []);
  const startMic = reactExports.useCallback(async () => {
    const status = asr ?? await window.companion.asrStatus();
    setAsr(status);
    if (!status?.available) {
      flashNotice(`Voice input unavailable: ${status?.reason ?? "no ASR model"}`);
      return false;
    }
    if (!micRef.current) micRef.current = new MicCapture();
    await micRef.current.start({
      onSpeechStart: () => {
        window.dispatchEvent(new Event("companion:bargein"));
        setPose("listening");
      },
      onUtterance: async (samples, sr) => {
        const text = await window.companion.transcribe(samples, sr);
        if (text) {
          window.companion.sendInput(text + "\r");
          setExpression("neutral");
        }
      },
      onError: (e) => {
        flashNotice(`Mic: ${e}`);
        setMicOn(false);
        void window.companion.setSettings({ mic: false });
      }
    });
    setMicOn(true);
    return true;
  }, [asr, flashNotice]);
  const toggleMic = reactExports.useCallback(async () => {
    if (micOn) {
      micRef.current?.stop();
      setMicOn(false);
      await window.companion.setSettings({ mic: false });
    } else if (await startMic()) {
      await window.companion.setSettings({ mic: true });
    }
  }, [micOn, startMic]);
  const shareScreen = reactExports.useCallback(async () => {
    flashNotice("Capturing screen…");
    const path = await window.companion.captureScreen();
    if (!path) {
      flashNotice("Screenshot failed — grant Screen Recording permission and retry.");
      return;
    }
    window.companion.sendInput(`Take a look at this screenshot of my screen: ${path}\r`);
    handleSend();
    flashNotice("Sent a screenshot to the session.");
  }, [flashNotice, handleSend]);
  reactExports.useEffect(() => {
    if (micAutoStarted.current || !asr || !micPrefRef.current) return;
    micAutoStarted.current = true;
    if (asr.available) void startMic();
  }, [asr, startMic]);
  const handleStatus = reactExports.useCallback((status, ok2) => {
    setCli(status);
    setSessionOk(ok2);
  }, []);
  const toggleHooks = reactExports.useCallback(async () => {
    const next = hooks?.installed ? await window.companion.uninstallHooks() : await window.companion.installHooks();
    setHooks(next);
    if (next.error) flashNotice(`Hooks: ${next.error}`);
    else if (next.installed)
      flashNotice("Reactions installed for this project — restart the session to apply.");
    else flashNotice("Reactions removed.");
  }, [hooks, flashNotice]);
  const changeDir = reactExports.useCallback(async () => {
    const dir = await window.companion.pickDirectory();
    if (!dir || dir === projectDir) return;
    await window.companion.setSettings({ projectDir: dir });
    setProjectDir(dir);
    window.companion.hooksStatus().then(setHooks);
    flashNotice(`Start directory: ${dir} — session restarted.`);
  }, [projectDir, flashNotice]);
  const toggleVoice = reactExports.useCallback(async () => {
    const next = !voiceEnabled;
    setVoiceEnabled(next);
    await window.companion.setSettings({ voice: next });
  }, [voiceEnabled]);
  const selectModel = reactExports.useCallback(async (id2) => {
    setSelectedModel(id2);
    await window.companion.setSettings({ avatarModel: id2 });
  }, []);
  const applyPersonality = reactExports.useCallback(
    async (text) => {
      setPersonality(text);
      await window.companion.setSettings({ personality: text });
      setSessionNonce((n2) => n2 + 1);
      flashNotice(text.trim() ? "Personality applied — session restarted." : "Personality cleared.");
    },
    [flashNotice]
  );
  const needsGuidance = cli && !cli.found;
  const reactionsOn = hooks?.installed ?? false;
  const dirLabel = projectDir ? basename(projectDir) : "…";
  const activeModel = selectedModel !== PLACEHOLDER_MODEL ? models.find((m2) => m2.id === selectedModel) : void 0;
  const modelUrl = activeModel?.modelUrl ?? null;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "app", "data-pose": pose, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("header", { className: "titlebar", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "titlebar-drag", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "dot", "aria-hidden": true }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "title", children: "companion" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "pose-tag", children: pose }),
        activity && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "activity-tag", children: activity })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "titlebar-actions", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "button",
          {
            className: "icon-btn dir-btn",
            onClick: changeDir,
            title: projectDir ? `start directory: ${projectDir} — click to change` : "set start directory",
            children: [
              "📁 ",
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "dir-label", children: dirLabel })
            ]
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            className: `icon-btn${reactionsOn ? " active" : ""}`,
            onClick: toggleHooks,
            title: reactionsOn ? "reactions on — click to remove hooks" : "enable avatar reactions (install hooks)",
            children: "⚡"
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            className: `icon-btn${voiceEnabled ? " active" : ""}`,
            onClick: toggleVoice,
            title: voiceEnabled ? "voice on — click to mute" : "speak replies aloud (TTS)",
            children: voiceEnabled ? "🔊" : "🔈"
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            className: `icon-btn${micOn ? " active" : ""}`,
            onClick: toggleMic,
            title: micOn ? "listening — click to stop" : asr?.available === false ? `voice input unavailable: ${asr.reason ?? "no ASR model"}` : "voice input (speak to the companion)",
            children: micOn ? "🎙️" : "🎤"
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            className: "icon-btn",
            onClick: shareScreen,
            title: "show the session a screenshot of your screen",
            children: "📷"
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            className: "icon-btn",
            onClick: () => setShowSettings(true),
            title: "settings",
            children: "⚙"
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            className: "icon-btn",
            onClick: () => setShowTerminal((v2) => !v2),
            title: showTerminal ? "hide terminal" : "show terminal",
            children: showTerminal ? "▤" : "▥"
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            className: "icon-btn close",
            onClick: () => window.companion.quit(),
            title: "quit",
            children: "✕"
          }
        )
      ] })
    ] }),
    notice && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "toast", children: notice }),
    showSettings && /* @__PURE__ */ jsxRuntimeExports.jsx(
      Settings,
      {
        onClose: () => setShowSettings(false),
        projectDir,
        onChangeDir: changeDir,
        models,
        selectedModel,
        onSelectModel: selectModel,
        personality,
        personas: mergePersonas(customPersonas),
        onApplyPersonality: applyPersonality,
        voiceEnabled,
        onToggleVoice: toggleVoice,
        reactionsOn,
        onToggleReactions: toggleHooks,
        micOn,
        onToggleMic: toggleMic,
        asrAvailable: asr?.available ?? false,
        asrReason: asr?.reason
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("main", { className: "stage", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("section", { className: "avatar-pane", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          AvatarStage,
          {
            modelUrl,
            pose,
            expression,
            voiceEnabled,
            expressionMap: activeModel?.expressionMap,
            motionMap: activeModel?.motionMap,
            transform: activeModel?.transform,
            onCaption: setCaption
          }
        ),
        caption && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "caption", children: caption }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(ChatBox, { onSend: handleSend })
      ] }),
      showTerminal && /* @__PURE__ */ jsxRuntimeExports.jsx("section", { className: "terminal-pane", children: needsGuidance ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "guidance", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { children: "Claude Code not found" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { children: cli?.guidance }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "muted", children: "This companion uses your existing Claude Code login. It never needs an Anthropic API key." })
      ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
        sessionOk === false && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "banner warn", children: [
          "Couldn’t start the session. ",
          cli?.guidance ?? ""
        ] }),
        projectDir && /* @__PURE__ */ jsxRuntimeExports.jsx(
          TerminalView,
          {
            onStatus: handleStatus,
            onOutput: handleOutput,
            onEmotion: handleEmotion
          },
          `${projectDir}|${sessionNonce}`
        )
      ] }) })
    ] })
  ] });
}
const root = document.getElementById("root");
if (!root) throw new Error("#root not found");
createRoot(root).render(
  /* @__PURE__ */ jsxRuntimeExports.jsx(reactExports.StrictMode, { children: /* @__PURE__ */ jsxRuntimeExports.jsx(App, {}) })
);
