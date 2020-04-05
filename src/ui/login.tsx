import * as React from 'react';
import {AppInfo} from "../shared/types";

export interface Props {
    appInfo: AppInfo;
}

export class Login extends React.Component<Props, any> {
    constructor(props) {
        super(props);
        this.state = {};
    }
    render() {
        return (
        <div>
            <div className="w3-blue" style={{width:"100vw", height:"100vh"}}></div>
            <div className="w3-border w3-padding w3-white" style={{position:"fixed",top:"300px",left:"50%",transform:"translateX(-50%)"}}>
                <h4>Welcome to {this.props.appInfo.description} (v{this.props.appInfo.version})</h4>
                <p>Please Sign in</p>
                <a className="w3-button w3-small w3-border w3-round w3-border-blue" href="/login">Sign In</a>
            </div>
        </div>
        );
    }
}