
import * as React from 'react';
import {Login} from "./login";
import {App} from "./app";
import {Session} from "../shared/api-session";
import {client} from "./api-client";

export interface Props {
    user: any;
    redirectPath: string;
}

interface State {
    user?: any;
    redirectPath?: string;
}

export class ADApp extends React.Component<Props, State> {
    constructor(props) {
        super(props);
        this.state = {};
    }
    static getDerivedStateFromProps(props: Props, state: State) {
        return {user: (props.user ? props.user : null), redirectPath: (props.redirectPath ? props.redirectPath : null)};
    }
    render() {
        const authenticated = (this.state.user ? true : false);
        return (authenticated ? <App apiSession={Session.init(client)} user={this.state.user} redirectPath={this.state.redirectPath}/> : <Login/>);
    }
}