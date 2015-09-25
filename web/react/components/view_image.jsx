// Copyright (c) 2015 Spinpunch, Inc. All Rights Reserved.
// See License.txt for license information.

var Client = require('../utils/client.jsx');
var Utils = require('../utils/utils.jsx');
var ViewImagePopoverBar = require('./view_image_popover_bar.jsx');
var Modal = ReactBootstrap.Modal;

export default class ViewImageModal extends React.Component {
    constructor(props) {
        super(props);

        this.canSetState = false;

        this.loadImage = this.loadImage.bind(this);
        this.handleNext = this.handleNext.bind(this);
        this.handlePrev = this.handlePrev.bind(this);
        this.handleKeyPress = this.handleKeyPress.bind(this);
        this.getPublicLink = this.getPublicLink.bind(this);
        this.getPreviewImagePath = this.getPreviewImagePath.bind(this);
        this.onModalShown = this.onModalShown.bind(this);
        this.onModalHidden = this.onModalHidden.bind(this);
        this.onMouseEnterImage = this.onMouseEnterImage.bind(this);
        this.onMouseLeaveImage = this.onMouseLeaveImage.bind(this);

        var loaded = [];
        var progress = [];
        for (var i = 0; i < this.props.filenames.length; i++) {
            loaded.push(false);
            progress.push(0);
        }
        this.state = {
            imgId: this.props.startId,
            imgHeight: '100%',
            loaded: loaded,
            progress: progress,
            images: {},
            fileSizes: {},
            showFooter: false
        };
    }
    handleNext(e) {
        if (e) {
            e.stopPropagation();
        }
        var id = this.state.imgId + 1;
        if (id > this.props.filenames.length - 1) {
            id = 0;
        }
        this.setState({imgId: id});
        this.loadImage(id);
    }
    handlePrev(e) {
        if (e) {
            e.stopPropagation();
        }
        var id = this.state.imgId - 1;
        if (id < 0) {
            id = this.props.filenames.length - 1;
        }
        this.setState({imgId: id});
        this.loadImage(id);
    }
    handleKeyPress(e) {
        if (!e) {
            return;
        } else if (e.keyCode === 39) {
            this.handleNext();
        } else if (e.keyCode === 37) {
            this.handlePrev();
        }
    }
    onModalShown(nextProps) {
        this.setState({imgId: nextProps.startId});
        this.loadImage(nextProps.startId);
    }
    onModalHidden() {
        if (this.refs.video) {
            var video = React.findDOMNode(this.refs.video);
            video.pause();
            video.currentTime = 0;
        }
    }
    componentWillReceiveProps(nextProps) {
        if (nextProps.show === true && this.props.show === false) {
            this.onModalShown(nextProps);
        } else if (nextProps.show === false && this.props.show === true) {
            this.onModalHidden();
        }
    }
    loadImage(id) {
        var imgHeight = $(window).height() - 100;
        this.setState({imgHeight});

        var filename = this.props.filenames[id];

        var fileInfo = Utils.splitFileLocation(filename);
        var fileType = Utils.getFileType(fileInfo.ext);

        if (fileType === 'image') {
            var img = new Image();
            img.load(this.getPreviewImagePath(filename),
                     () => {
                         const progress = this.state.progress;
                         progress[id] = img.completedPercentage;
                         this.setState({progress});
                     });
            img.onload = () => {
                const loaded = this.state.loaded;
                loaded[id] = true;
                this.setState({loaded});
            };
            var images = this.state.images;
            images[id] = img;
            this.setState({images});
        } else {
            // there's nothing to load for non-image files
            var loaded = this.state.loaded;
            loaded[id] = true;
            this.setState({loaded});
        }
    }
    componentDidMount() {
        $(window).on('keyup', this.handleKeyPress);

        // keep track of whether or not this component is mounted so we can safely set the state asynchronously
        this.canSetState = true;
    }
    componentWillUnmount() {
        this.canSetState = false;
        $(window).off('keyup', this.handleKeyPress);
    }
    getPublicLink() {
        var data = {};
        data.channel_id = this.props.channelId;
        data.user_id = this.props.userId;
        data.filename = this.props.filenames[this.state.imgId];
        Client.getPublicLink(data,
            function sucess(serverData) {
                if (Utils.isMobile()) {
                    window.location.href = serverData.public_link;
                } else {
                    window.open(serverData.public_link);
                }
            },
            function error() {}
        );
    }
    getPreviewImagePath(filename) {
        // Returns the path to a preview image that can be used to represent a file.
        var fileInfo = Utils.splitFileLocation(filename);
        var fileType = Utils.getFileType(fileInfo.ext);

        if (fileType === 'image') {
            // This is a temporary patch to fix issue with old files using absolute paths
            if (fileInfo.path.indexOf('/api/v1/files/get') !== -1) {
                fileInfo.path = fileInfo.path.split('/api/v1/files/get')[1];
            }
            fileInfo.path = Utils.getWindowLocationOrigin() + '/api/v1/files/get' + fileInfo.path;

            return fileInfo.path + '_preview.jpg';
        }

        // only images have proper previews, so just use a placeholder icon for non-images
        return Utils.getPreviewImagePathForFileType(fileType);
    }
    onMouseEnterImage() {
        this.setState({showFooter: true});
    }
    onMouseLeaveImage() {
        this.setState({showFooter: false});
    }
    render() {
        if (this.props.filenames.length < 1 || this.props.filenames.length - 1 < this.state.imgId) {
            return <div/>;
        }

        var filename = this.props.filenames[this.state.imgId];
        var fileUrl = Utils.getFileUrl(filename);

        var name = decodeURIComponent(Utils.getFileName(filename));

        var content;
        var bgClass = '';
        if (this.state.loaded[this.state.imgId]) {
            var fileInfo = Utils.splitFileLocation(filename);
            var fileType = Utils.getFileType(fileInfo.ext);

            if (fileType === 'image') {
                // image files just show a preview of the file
                content = (
                    <a
                        href={fileUrl}
                        target='_blank'
                    >
                        <img
                            ref='image'
                            src={this.getPreviewImagePath(filename)}
                        />
                    </a>
                );
            } else if (fileType === 'video' || fileType === 'audio') {
                content = (
                    <video
                        ref='video'
                        data-setup='{}'
                        controls='controls'
                    >
                        <source src={Utils.getWindowLocationOrigin() + '/api/v1/files/get' + filename} />
                    </video>
                );
            } else {
                // non-image files include a section providing details about the file
                var infoString = 'File type ' + fileInfo.ext.toUpperCase();
                if (this.state.fileSizes[filename] && this.state.fileSizes[filename] >= 0) {
                    infoString += ', Size ' + Utils.fileSizeToString(this.state.fileSizes[filename]);
                }

                content = (
                    <div className='file-details__container'>
                        <a
                            className={'file-details__preview'}
                            href={fileUrl}
                            target='_blank'
                        >
                            <span className='file-details__preview-helper' />
                            <img
                                ref='image'
                                src={this.getPreviewImagePath(filename)}
                            />
                        </a>
                        <div className='file-details'>
                            <div className='file-details__name'>{name}</div>
                            <div className='file-details__info'>{infoString}</div>
                        </div>
                    </div>
                );
                bgClass = 'white-bg';

                // asynchronously request the actual size of this file
                if (!(filename in this.state.fileSizes)) {
                    Client.getFileInfo(
                        filename,
                        function success(data) {
                            if (this.canSetState) {
                                var fileSizes = this.state.fileSizes;
                                fileSizes[filename] = parseInt(data.size, 10);
                                this.setState(fileSizes);
                            }
                        }.bind(this),
                        function fail() {}
                    );
                }
            }
        } else {
            // display a progress indicator when the preview for an image is still loading
            var percentage = Math.floor(this.state.progress[this.state.imgId]);
            if (percentage) {
                content = (
                    <div>
                        <img
                            className='loader-image'
                            src='/static/images/load.gif'
                        />
                        <span className='loader-percent'>
                            {'Previewing ' + percentage + '%'}
                        </span>
                    </div>
                );
            } else {
                content = (
                    <div>
                        <img
                            className='loader-image'
                            src='/static/images/load.gif'
                        />
                    </div>
                );
            }
            bgClass = 'black-bg';
        }

        var leftArrow = '';
        var rightArrow = '';
        if (this.props.filenames.length > 1) {
            leftArrow = (
                <a
                    ref='previewArrowLeft'
                    className='modal-prev-bar'
                    href='#'
                    onClick={this.handlePrev}
                >
                    <i className='image-control image-prev'/>
                </a>
            );

            rightArrow = (
                <a
                    ref='previewArrowRight'
                    className='modal-next-bar'
                    href='#'
                    onClick={this.handleNext}
                >
                    <i className='image-control image-next'/>
                </a>
            );
        }

        let closeButtonClass = 'modal-close';
        if (this.state.showFooter) {
            closeButtonClass += ' modal-close--show';
        }

        return (
            <Modal
                show={this.props.show}
                onHide={this.props.onModalDismissed}
                className='image_modal'
                dialogClassName='modal-image'
            >
                <Modal.Body
                    modalClassName='image-body'
                    onClick={this.props.onModalDismissed}
                >
                    <div
                        className={'image-wrapper ' + bgClass}
                        style={{maxHeight: this.state.imgHeight}}
                        onMouseEnter={this.onMouseEnterImage}
                        onMouseLeave={this.onMouseLeaveImage}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div
                            className={closeButtonClass}
                            onClick={this.props.onModalDismissed}
                        />
                        {content}
                        <ViewImagePopoverBar
                            show={this.state.showFooter}
                            fileId={this.state.imgId}
                            totalFiles={this.props.filenames.length}
                            filename={name}
                            fileURL={fileUrl}
                            onGetPublicLinkPressed={this.getPublicLink}
                        />
                    </div>
                    {leftArrow}
                    {rightArrow}
                </Modal.Body>
            </Modal>
        );
    }
}

ViewImageModal.defaultProps = {
    show: false,
    filenames: [],
    channelId: '',
    userId: '',
    startId: 0
};
ViewImageModal.propTypes = {
    show: React.PropTypes.bool.isRequired,
    onModalDismissed: React.PropTypes.func.isRequired,
    filenames: React.PropTypes.array,
    modalId: React.PropTypes.string,
    channelId: React.PropTypes.string,
    userId: React.PropTypes.string,
    startId: React.PropTypes.number
};
