let dictionary = {
    "00191008" : [ "CS", "p_HeaderType", 1, 1, "SIEMENS MR HEADER" ],

        //(0019xx09)   SIEMENS MR HEADER    Header Version                      LO   1
        "00191009" : [ "LO", "p_HeaderVersion", 1, 1, "SIEMENS MR HEADER" ],

        //(0019xx0A)   SIEMENS MR HEADER    Number Of Images In Mosaic          US   1
        "0019100A" : [ "US", "p_NumberOfImagesInMosaic", 1, 1, "SIEMENS MR HEADER" ],

        //0019xx0B)   SIEMENS MR HEADER    Slice Measurement Duration          DS   1
        "0019100B" : [ "DS", "p_SliceMeasurementDuration", 1, 1, "SIEMENS MR HEADER" ],

        //(0019xx0C)   SIEMENS MR HEADER    B value                             IS   1
        "0019100C" : [ "IS", "p_Bvalue", 1, 1, "SIEMENS MR HEADER" ],

        //(0019xx0D)   SIEMENS MR HEADER    Diffusion Directionality            CS   1
        "0019100D" : [ "CS", "p_DiffusionDirectionality", 1, 1, "SIEMENS MR HEADER" ],

        //(0019xx0E)   SIEMENS MR HEADER    Diffusion Gradient Direction        FD   3
        "0019100E" : [ "FD", "p_DiffusionGradientDirection", 3, 3, "SIEMENS MR HEADER" ],

        //(0019xx0F)   SIEMENS MR HEADER    Gradient Mode                       SH   1
        "0019100F" : [ "SH", "p_GradientMode", 1, 1, "SIEMENS MR HEADER" ],

        //(0019xx11)   SIEMENS MR HEADER    Flow Compensation                   SH   1
        "00191011" : [ "SH", "p_FlowCompensation", 1, 1, "SIEMENS MR HEADER" ],

        //(0019xx12)   SIEMENS MR HEADER    Table Position Origin               SL   3
        "00191012" : [ "SL", "p_TablePositionOrigin", 3, 3, "SIEMENS MR HEADER" ],

        //(0019xx13)   SIEMENS MR HEADER    Ima Abs Table Position              SL   3
        "00191013" : [ "SL", "p_ImaAbsTablePosition", 3, 3, "SIEMENS MR HEADER" ],

        //(0019xx14)   SIEMENS MR HEADER    Ima Rel Table Position              IS   3
        "00191014" : [ "IS", "p_ImaRelTablePosition", 3, 3, "SIEMENS MR HEADER" ],

        //(0019xx15)   SIEMENS MR HEADER    SlicePosition PCS                   FD   3
        "00191015" : [ "FD", "p_SlicePositionPCS", 1, 1, "SIEMENS MR HEADER" ],

        //(0019xx16)   SIEMENS MR HEADER    Time After Start                    DS   1
        "00191016" : [ "DS", "p_TimeAfterStart", 1, 1, "SIEMENS MR HEADER" ],

        //(0019xx17)   SIEMENS MR HEADER    Slice Resolution                    DS   1
        "00191017" : [ "DS", "p_SliceResolution", 1, 1, "SIEMENS MR HEADER" ],

        //(0019xx18)   SIEMENS MR HEADER    Real Dwell Time                     IS   1
        "00191018" : [ "IS", "p_RealDwellTime", 1, 1, "SIEMENS MR HEADER" ],

        //(0019xx19)   SIEMENS MR HEADER    Voxel Thickness                     DS   1
        "00191019" : [ "DS", "p_VoxelThickness", 1, 1, "SIEMENS MR HEADER" ],

        //(0019xx1A)   SIEMENS MR HEADER    Voxel PhaseFOV                      DS   1
        "0019101A" : [ "DS", "p_VoxelPhaseFOV", 1, 1, "SIEMENS MR HEADER" ],

        //(0019xx1B)   SIEMENS MR HEADER    Voxel ReadoutFOV                    DS   1
        "0019101B" : [ "DS", "p_VoxelReadoutFOV", 1, 1, "SIEMENS MR HEADER" ],

        //(0019xx1C)   SIEMENS MR HEADER    Voxel PositionSag                   DS   1
        "0019101C" : [ "DS", "p_VoxelPositionSag", 1, 1, "SIEMENS MR HEADER" ],

        //(0019xx1D)   SIEMENS MR HEADER    Voxel PositionCor                   DS   1
        "0019101C" : [ "DS", "p_VoxelPositionCor", 1, 1, "SIEMENS MR HEADER" ],

        //(0019xx1E)   SIEMENS MR HEADER    Voxel PositionTra                   DS   1
        "0019101E" : [ "DS", "p_VoxelPositionTra", 1, 1, "SIEMENS MR HEADER" ],

        //(0019xx1F)   SIEMENS MR HEADER    Voxel Normal Sag                    DS   1
        "0019101F" : [ "DS", "p_VoxelNormalSag", 1, 1, "SIEMENS MR HEADER" ],

        //(0019xx20)   SIEMENS MR HEADER    Voxel Normal Cor                    DS   1
        "00191020" : [ "DS", "p_VoxelNormalCor", 1, 1, "SIEMENS MR HEADER" ],

        //(0019xx21)   SIEMENS MR HEADER    Voxel Normal Tra                    DS   1
        "00191021" : [ "DS", "p_VoxelNormalTra", 1, 1, "SIEMENS MR HEADER" ],

        //(0019xx22)   SIEMENS MR HEADER    Voxel In Plane Rot                  DS   1
        "00191022" : [ "DS", "p_VoxelInPlaneRot", 1, 1, "SIEMENS MR HEADER" ],

        //(0019xx23)   SIEMENS MR HEADER    FMRI Stimul Info                    IS   1
        "00191023" : [ "IS", "p_FMRIStimulInfo", 1, 1, "SIEMENS MR HEADER" ],

        //(0019xx24)   SIEMENS MR HEADER    FMRI Stimul Level                   FD   1
        "00191024" : [ "FD", "p_FMRIStimulLevel", 1, 1, "SIEMENS MR HEADER" ],

        //(0019xx25)   SIEMENS MR HEADER    RB MoCo Trans                       FD   3
        "00191025" : [ "FD", "p_RBMocoTrans", 3, 3, "SIEMENS MR HEADER" ],

        //(0019xx26)   SIEMENS MR HEADER    RB MoCo Rot                         FD   3
        "00191026" : [ "FD", "p_RBMocoRot", 3, 3, "SIEMENS MR HEADER" ],

        //(0019xx27)   SIEMENS MR HEADER    B matrix                            FD   6
        "00191027" : [ "FD", "p_Bmatrix", 6, 6, "SIEMENS MR HEADER" ],

        //(0019xx28)   SIEMENS MR HEADER    Band width Per Pixel Phase Encode   FD   1
        "00191028" : [ "FD", "p_BandwidthPerPixelPhaseEncode", 1, 1, "SIEMENS MR HEADER" ],

        ///////////////////////////////////////////////////////////////////////////////////////////////
        //#Image Text related Data

        //(0051xx08)   SIEMENS MR HEADER    Header Type                         CS   1
        "00511008" : [ "CS", "p_HeaderType_51", 1, 1, "SIEMENS MR HEADER" ],

        //(0051xx09)   SIEMENS MR HEADER    Header Version                      LO   1
        "00511009" : [ "LO", "p_HeaderVersion_51", 1, 1, "SIEMENS MR HEADER" ],

        //(0051xx0A)   SIEMENS MR HEADER    Meas Duration                       SH   1
        "0051100A" : [ "SH", "p_MeasDuration", 1, 1, "SIEMENS MR HEADER" ],

        //(0051xx0B)   SIEMENS MR HEADER    Acquisition Matrix                  SH   1
        "0051100B" : [ "SH", "p_AcquisitionMatrix", 1, 1, "SIEMENS MR HEADER" ],

        //(0051xx0C)   SIEMENS MR HEADER    Field Of View                       SH   1
        "0051100C" : [ "SH", "p_FieldOfView", 1, 1, "SIEMENS MR HEADER" ],

        //(0051xx0D)   SIEMENS MR HEADER    Slice Position                      SH   1
        "0051100D" : [ "SH", "p_SlicePosition", 1, 1, "SIEMENS MR HEADER" ],

        //(0051xx0E)   SIEMENS MR HEADER    Slice Orientation                   SH   1
        "0051100E" : [ "SH", "p_SliceOrientation", 1, 1, "SIEMENS MR HEADER" ],

        //(0051xx0F)   SIEMENS MR HEADER    Coil String                         LO   1
        "0051100F" : [ "LO", "p_CoilString", 1, 1, "SIEMENS MR HEADER" ],

        //(0051xx11)   SIEMENS MR HEADER    PAT Mode Text                       LO   1
        "00511011" : [ "LO", "p_PATModeText", 1, 1, "SIEMENS MR HEADER" ],

        //(0051xx12)   SIEMENS MR HEADER    Rel Table Position                  SH   1
        "00511012" : [ "SH", "p_RelTablePosition", 1, 1, "SIEMENS MR HEADER" ],

        //(0051xx13)   SIEMENS MR HEADER    Positive PCS Directions             SH   1
        "00511013" : [ "SH", "p_PositivePCSDirections", 1, 1, "SIEMENS MR HEADER" ],

        //(0051xx14)   SIEMENS MR HEADER    Flow Encoding Direction String      SH   1
        "00511015" : [ "SH", "p_FlowEncodingDirectionString", 1, 1, "SIEMENS MR HEADER" ],

        //(0051xx15)   SIEMENS MR HEADER    Sequence Mask                       SH   1
        "00511015" : [ "SH", "p_SequenceMask", 1, 1, "SIEMENS MR HEADER" ],

        //(0051xx16)   SIEMENS MR HEADER    Image Type                          LO   1
        "00511016" : [ "LO", "p_ImageType", 1, 1, "SIEMENS MR HEADER" ],

        //(0051xx17)   SIEMENS MR HEADER    Slice Thickness                     SH   1
        "00511017" : [ "SH", "p_SliceThickness", 1, 1, "SIEMENS MR HEADER" ],

        //(0051xx18)   SIEMENS MR HEADER    Scan Options 1                      SH   1
        "00511018" : [ "SH", "p_ScanOptions1", 1, 1, "SIEMENS MR HEADER" ],

        //(0051xx19)   SIEMENS MR HEADER    Scan Options 2                      LO   1
        "00511019" : [ "LO", "p_ScanOptions2", 1, 1, "SIEMENS MR HEADER" ]
}

exports.dictionary = dictionary;
