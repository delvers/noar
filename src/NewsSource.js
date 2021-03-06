import React from "react";

export class NewsSourceEntry extends React.Component {
    constructor(props) {
        super(props);

        // This binding is necessary to make `this` work in the callback
        this.handleClick = this.handleClick.bind(this);
    }

    handleClick(e) {
        e.preventDefault();
        this.props.handleNewsSourceChange(e);
    }

    render() {
        return (
            <a className={this.props.isActive ? "active mdl-navigation__link" : "mdl-navigation__link" }
               itemID={this.props.id}
               onClick={(e) => this.handleClick(e)}
               href="">{this.props.title}</a>
        );
    }
}

export class NewsSourceEntryList extends React.Component {
    constructor(props){
        super(props);
        this.addEntry = this.addEntry.bind(this);
    }

    addEntry(e) {
        e.preventDefault();
        document.getElementById("addSourceDlg").showModal();
    }



    render() {
        console.log(this.props.entries);
        return (
            <nav id="navigation" className="mdl-navigation">
                {this.props.entries.map((entry) =>
                    <NewsSourceEntry key={entry.id}
                                     title={entry.title}
                                     isActive={entry === this.props.currentEntry}
                                     handleNewsSourceChange = {this.props.handleNewsSourceChange(entry)}/>)}
                <div className="mdl-layout-spacer"></div>
                <a className="mdl-navigation__link" onClick={this.addEntry}>Add</a>
            </nav>
        )
    }
}