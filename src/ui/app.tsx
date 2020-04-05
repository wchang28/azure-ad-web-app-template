import * as React from 'react';
import {Session} from "../shared/api-session";

export interface Props {
    user: any;
    apiSession: Session;
    redirectPath: string;
}

interface State {
    redirectPath?: string;
}

export class App extends React.Component<Props, State> {
    constructor(props) {
        super(props);
        this.state = {};
    }
    static getDerivedStateFromProps(props: Props, state: State) {
        return {redirectPath: (props.redirectPath ? props.redirectPath : null)};
    }
    private async onTestClick() {
        const ret = await this.props.apiSession.me();
        alert(JSON.stringify(ret));
    }
    render() {
        return (
        <div>
            <div className="w3-margin">
                <h4>Welcome to the app {this.props.user.name}</h4>
                <p>
                    <button className="w3-button w3-small w3-border w3-round w3-border-blue" onClick={() => this.onTestClick()}>Test API Call</button>
                    {' '}
                    <a className="w3-button w3-small w3-border w3-round w3-border-blue" href="/debug-session">Debug Session</a>
                </p>
                <p><a className="w3-button w3-small w3-border w3-round w3-border-blue" href="/logout">Sign Out</a></p>
            </div>
        </div>
        );
    }
}