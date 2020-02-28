
import * as React from 'react';
import {Login} from "./login";
import {App} from "./app";
import {Session} from "../shared/api-session";
import {client} from "./api-client";

export interface Props {
    user: any;
}

interface State {
    user?: any;
}

export class ADApp extends React.Component<Props, State> {
    constructor(props) {
        super(props);
        this.state = {};
    }
    static getDerivedStateFromProps(props: Props, state: State) {
        return {user: (props.user ? props.user : null)};
    }
    render() {
        return (this.state.user ? <App apiSession={Session.init(client)} user={this.state.user}/> : <Login/>);
    }
}