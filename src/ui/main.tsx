import * as React from 'react';
import * as ReactDOM from "react-dom";
import {ADApp} from "./ad-app";

ReactDOM.render(<ADApp user={window["user"]} redirectPath={window["redirectPath"]}/>, document.getElementById('main'));